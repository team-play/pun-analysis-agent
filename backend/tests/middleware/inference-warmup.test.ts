import assert from "node:assert/strict";
import { afterEach, beforeEach, type Mock, mock, test } from "node:test";
import { logger } from "genkit/logging";
import { Hono } from "hono";
import { warmInference } from "../../src/middleware/inference-warmup.ts";

const INFERENCE_URL = "http://localhost:8000";
const MINUTE = 60_000;
const INTERVAL_MS = 5 * MINUTE;

/** Lets a ping that was sent without being awaited settle. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

// A stand-in for the chat handler: these tests are about when the
// middleware pings Inference and whether the reply waits for it.
const buildApp = (fetch: typeof globalThis.fetch) => {
	let clock = 0;
	const app = new Hono();
	app.use(
		"/api/chat",
		warmInference({
			fetch,
			inferenceUrl: INFERENCE_URL,
			intervalMs: INTERVAL_MS,
			now: () => clock,
		}),
	);
	app.post("/api/chat", (c) => c.text("reply"));
	return {
		/** Sends a chat request `minutes` after the first one. */
		chatAt: (minutes: number) => {
			clock = minutes * MINUTE;
			return app.request("/api/chat", { method: "POST" });
		},
	};
};

// A ping that never answers. The tests using it get a timeout, so a
// middleware that waited for the ping fails them instead of hanging the run.
const hangingFetch = () =>
	mock.fn<typeof globalThis.fetch>(() => new Promise(() => {}));
const HANG_GUARD = { timeout: 1000 };

const okFetch = () =>
	mock.fn<typeof globalThis.fetch>(async () => Response.json({ status: "ok" }));

let logWarn: Mock<typeof logger.warn>;

beforeEach(() => {
	logWarn = mock.method(logger, "warn", () => {});
});
afterEach(() => mock.restoreAll());

test("the first chat request sends GET /health to Inference", async () => {
	const fetch = okFetch();
	const { chatAt } = buildApp(fetch);

	const res = await chatAt(0);

	assert.equal(await res.text(), "reply");
	assert.equal(fetch.mock.callCount(), 1);
	const [url, init] = fetch.mock.calls[0].arguments;
	assert.equal(String(url), `${INFERENCE_URL}/health`);
	assert.equal(init?.method ?? "GET", "GET");
	await settle();
	assert.equal(logWarn.mock.callCount(), 0);
});

test("a chat request inside the window doesn't ping again", async () => {
	const fetch = okFetch();
	const { chatAt } = buildApp(fetch);

	await chatAt(0);
	await chatAt(4.99);

	assert.equal(fetch.mock.callCount(), 1);
});

test("a chat request once the window is over pings again", async () => {
	const fetch = okFetch();
	const { chatAt } = buildApp(fetch);

	await chatAt(0);
	await chatAt(5);

	assert.equal(fetch.mock.callCount(), 2);
});

// The window starts at the last ping, not the last chat: if each chat
// restarted it, chats every few minutes would never ping again and
// Inference could idle out in the middle of them.
test("the window counts from the last ping, not the last chat request", async () => {
	const fetch = okFetch();
	const { chatAt } = buildApp(fetch);

	for (const minutes of [0, 3, 6, 7]) await chatAt(minutes);

	assert.equal(fetch.mock.callCount(), 2);
});

// Inference runs one request per instance, so pings that overlap a cold
// start would each start another instance.
test(
	"chat requests that arrive while a ping is still in flight don't ping again",
	HANG_GUARD,
	async () => {
		const fetch = hangingFetch();
		const { chatAt } = buildApp(fetch);

		await Promise.all([chatAt(0), chatAt(0), chatAt(0)]);

		assert.equal(fetch.mock.callCount(), 1);
	},
);

test(
	"a ping that never answers doesn't delay the reply",
	HANG_GUARD,
	async () => {
		const fetch = hangingFetch();
		const { chatAt } = buildApp(fetch);

		const res = await chatAt(0);

		assert.equal(res.status, 200);
		assert.equal(await res.text(), "reply");
	},
);

test("a ping that fails leaves the reply unaffected, is logged and isn't retried", async () => {
	// What fetch rejects with when nothing listens on Inference's port.
	const failure = new TypeError("fetch failed", {
		cause: Object.assign(new Error("connect ECONNREFUSED"), {
			code: "ECONNREFUSED",
		}),
	});
	const fetch = mock.fn<typeof globalThis.fetch>(async () => {
		throw failure;
	});
	const { chatAt } = buildApp(fetch);

	const res = await chatAt(0);
	await settle();

	assert.equal(res.status, 200);
	assert.equal(await res.text(), "reply");
	assert.equal(logWarn.mock.callCount(), 1);
	const [, fields, loggedErr] = logWarn.mock.calls[0].arguments;
	assert.deepEqual(fields, { errorCode: "ECONNREFUSED" });
	assert.equal(loggedErr, failure);

	// Not retried by the next chat either: it's still inside the window.
	await chatAt(1);
	assert.equal(fetch.mock.callCount(), 1);
});

test("a non-2xx answer to the ping is logged with its status", async () => {
	const fetch = mock.fn<typeof globalThis.fetch>(
		async () => new Response("Service Unavailable", { status: 503 }),
	);
	const { chatAt } = buildApp(fetch);

	const res = await chatAt(0);
	await settle();

	assert.equal(await res.text(), "reply");
	assert.equal(logWarn.mock.callCount(), 1);
	assert.deepEqual(logWarn.mock.calls[0].arguments[1], { status: 503 });
});

// Unread, the body would hold the connection open until garbage collection.
test("the answer's body is cancelled rather than left unread", async () => {
	let cancelled = false;
	const fetch = mock.fn<typeof globalThis.fetch>(
		async () =>
			new Response(
				new ReadableStream({
					cancel() {
						cancelled = true;
					},
				}),
			),
	);
	const { chatAt } = buildApp(fetch);

	await chatAt(0);
	await settle();

	assert.equal(cancelled, true);
});
