import assert from "node:assert/strict";
import { afterEach, beforeEach, type Mock, mock, test } from "node:test";
import { GenkitError, genkit, type StatusName } from "genkit";
import { logger } from "genkit/logging";
import { Hono } from "hono";
import { createChatHandler } from "../../src/routes/chat.js";
import { buildMockChatFlow } from "../helpers/build-mock-chat-flow.js";

// Registered once per genkit/testing's mockModel/reset() idiom — see
// tests/flows/chat.test.ts for why.
const testAi = genkit({});
const { model, chatFlow } = buildMockChatFlow(testAi);
const app = new Hono();
app.post("/api/chat", createChatHandler(chatFlow));

let logError: Mock<typeof logger.error>;

beforeEach(() => {
	model.reset();
	// Stubbed so error-path tests don't print full stack traces.
	logError = mock.method(logger, "error", () => {});
});
afterEach(() => mock.restoreAll());

test("POST /api/chat streams chunks then the final result in Genkit flow-stream format", async () => {
	model.respondWith((_request, { sendChunk }) => {
		sendChunk("Why did the ");
		sendChunk("scarecrow win an award? Outstanding in its field.");
		return {
			text: "Why did the scarecrow win an award? Outstanding in its field.",
		};
	});

	const res = await app.request("/api/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			messages: [{ role: "user", content: "Tell me a pun" }],
		}),
	});

	assert.equal(res.status, 200);
	const body = await res.text();
	const events = body
		.split("\n\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line.replace(/^data: /, "")));

	assert.deepEqual(events, [
		{ message: "Why did the " },
		{ message: "scarecrow win an award? Outstanding in its field." },
		{ result: "Why did the scarecrow win an award? Outstanding in its field." },
	]);
});

test("POST /api/chat rejects a body that doesn't match {messages:[{role,content}]}", async () => {
	model.respondWith("ok");

	const res = await app.request("/api/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ notMessages: true }),
	});

	assert.equal(res.status, 400);
});

test("POST /api/chat rejects malformed JSON", async () => {
	model.respondWith("ok");

	const res = await app.request("/api/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: "not json",
	});

	assert.equal(res.status, 400);
});

/** A GenkitError shaped like @genkit-ai/google-genai's for a failed Gemini call. */
const geminiError = (status: StatusName, httpStatus: string) =>
	new GenkitError({
		status,
		message: `Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?alt=sse: [${httpStatus}] upstream detail`,
		detail: { error: { code: Number.parseInt(httpStatus, 10) } },
	});

const postChat = (signal?: AbortSignal) =>
	app.request("/api/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
		signal,
	});

const errorEventFor = async (failure: Error) => {
	model.respondWith(() => {
		throw failure;
	});
	const res = await postChat();
	const body = await res.text();
	assert.match(body, /^error: .*\n\n$/s);
	return { body, event: JSON.parse(body.slice("error: ".length)) };
};

const failures = [
	{
		name: "Gemini overloaded (503)",
		failure: geminiError("UNAVAILABLE", "503 Service Unavailable"),
		expected: {
			status: "UNAVAILABLE",
			message: "The assistant is busy right now. Please try again in a moment.",
		},
	},
	{
		name: "Gemini timing out (504)",
		failure: geminiError("DEADLINE_EXCEEDED", "504 Gateway Timeout"),
		expected: {
			status: "DEADLINE_EXCEEDED",
			message: "The assistant is busy right now. Please try again in a moment.",
		},
	},
	{
		name: "Gemini quota exhausted (429)",
		failure: geminiError("RESOURCE_EXHAUSTED", "429 Too Many Requests"),
		expected: {
			status: "RESOURCE_EXHAUSTED",
			message:
				"The assistant has reached its usage limit for now. Please try again later.",
		},
	},
	{
		name: "invalid Gemini API key (400)",
		failure: geminiError("INVALID_ARGUMENT", "400 Bad Request"),
		expected: {
			status: "INVALID_ARGUMENT",
			message: "Something went wrong. Please try again.",
		},
	},
	{
		name: "a non-Genkit exception",
		failure: new Error("TypeError deep inside some dependency"),
		expected: {
			status: "INTERNAL",
			message: "Something went wrong. Please try again.",
		},
	},
];

for (const { name, failure, expected } of failures) {
	test(`POST /api/chat sends a user-facing error event for ${name}`, async () => {
		const { body, event } = await errorEventFor(failure);

		// Exactly {status, message}: no `details`, so no upstream payload.
		assert.deepEqual(event, { error: expected });
		assert.doesNotMatch(body, /googleapis|gemini|Error fetching|dependency/i);
	});
}

test("POST /api/chat logs the original error and its upstream detail server-side", async () => {
	const failure = geminiError("UNAVAILABLE", "503 Service Unavailable");

	await errorEventFor(failure);

	assert.equal(logError.mock.callCount(), 1);
	const [, metadata, loggedError] = logError.mock.calls[0]?.arguments ?? [];
	assert.equal(loggedError, failure);
	assert.deepEqual(metadata, { detail: failure.detail });
});

test("POST /api/chat neither logs nor sends an error when the client disconnects", async () => {
	const controller = new AbortController();
	model.respondWith(() => {
		controller.abort(); // e.g. the user pressed stop mid-reply
		throw new GenkitError({ status: "CANCELLED", message: "aborted" });
	});

	const res = await postChat(controller.signal);
	const body = await res.text().catch(() => "");

	assert.equal(logError.mock.callCount(), 0);
	assert.doesNotMatch(body, /^error: /m);
});
