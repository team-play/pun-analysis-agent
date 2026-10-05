import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { GoogleAuth, type IdTokenClient } from "google-auth-library";
import {
	createInferenceFetch,
	InferenceAuthError,
} from "../../src/tools/inference-fetch.ts";

const CLOUD_URL = "https://pun-agent-inference-123.us-east1.run.app";
const LOCAL_URL = "http://localhost:8000";

// The wrapper passes requests on to the global fetch; this records them
// instead of sending them.
let sent: ReturnType<typeof mock.method<typeof globalThis, "fetch">>;
beforeEach(() => {
	sent = mock.method(globalThis, "fetch", async () => Response.json({}));
});
afterEach(() => mock.restoreAll());

/** The headers of the one request passed on to the global fetch. */
const sentHeaders = () => {
	assert.equal(sent.mock.callCount(), 1);
	return new Headers(sent.mock.calls[0]?.arguments[1]?.headers);
};

const tokenHeaders = async () =>
	new Headers({ authorization: "Bearer id-token" });

for (const [name, url, onCloudRun] of [
	["empty, as a failed deploy lookup leaves it", "", true],
	["not a URL", "inference", false],
	["a path, not just an origin", `${CLOUD_URL}/analyze`, true],
	["a query string", `${CLOUD_URL}/?x=1`, true],
	["a fragment", `${CLOUD_URL}/#x`, true],
	["credentials", "https://user:pass@inference.run.app", true],
	["plain HTTP on Cloud Run", "http://inference.run.app", true],
	["HTTPS locally", "https://localhost:8000", false],
	["a non-loopback host locally", "http://inference.test:8000", false],
] as const) {
	test(`refuses an INFERENCE_URL with ${name}`, () => {
		assert.throws(
			() => createInferenceFetch(url, { onCloudRun }),
			/INFERENCE_URL must be a service origin/,
		);
	});
}

for (const [name, url, onCloudRun] of [
	["a Cloud Run HTTPS origin", CLOUD_URL, true],
	["localhost", LOCAL_URL, false],
	["127.0.0.1", "http://127.0.0.1:8000", false],
	["[::1]", "http://[::1]:8000", false],
] as const) {
	test(`accepts ${name} as INFERENCE_URL`, () => {
		assert.doesNotThrow(() =>
			createInferenceFetch(url, {
				onCloudRun,
				getAuthHeaders: tokenHeaders,
			}),
		);
	});
}

test("on Cloud Run, attaches the ID token to calls to Inference", async () => {
	const inferenceFetch = createInferenceFetch(CLOUD_URL, {
		onCloudRun: true,
		getAuthHeaders: tokenHeaders,
	});

	await inferenceFetch(`${CLOUD_URL}/analyze`, {
		headers: { "Content-Type": "application/json" },
	});

	const headers = sentHeaders();
	assert.equal(headers.get("authorization"), "Bearer id-token");
	assert.equal(headers.get("content-type"), "application/json");
	// A redirect could carry the token to another origin.
	assert.equal(sent.mock.calls[0]?.arguments[1]?.redirect, "error");
});

test("locally, sends no token and never asks for one", async () => {
	const getAuthHeaders = mock.fn(tokenHeaders);
	const inferenceFetch = createInferenceFetch(LOCAL_URL, {
		onCloudRun: false,
		getAuthHeaders,
	});

	await inferenceFetch(`${LOCAL_URL}/analyze`);

	assert.equal(sentHeaders().get("authorization"), null);
	assert.equal(getAuthHeaders.mock.callCount(), 0);
});

test("refuses another origin before asking for a token", async () => {
	const getAuthHeaders = mock.fn(tokenHeaders);
	const inferenceFetch = createInferenceFetch(CLOUD_URL, {
		onCloudRun: true,
		getAuthHeaders,
	});

	await assert.rejects(
		inferenceFetch("https://elsewhere.run.app/analyze"),
		/Unexpected Inference origin/,
	);
	assert.equal(getAuthHeaders.mock.callCount(), 0);
	assert.equal(sent.mock.callCount(), 0);
});

test("a failed token fetch rejects with InferenceAuthError, keeping its cause", async () => {
	const failure = new Error("metadata server said no");
	const inferenceFetch = createInferenceFetch(CLOUD_URL, {
		onCloudRun: true,
		getAuthHeaders: async () => {
			throw failure;
		},
	});

	await assert.rejects(
		inferenceFetch(`${CLOUD_URL}/analyze`),
		(err) => err instanceof InferenceAuthError && err.cause === failure,
	);
	assert.equal(sent.mock.callCount(), 0);
});

// analyze_pun's timeout has to cover the token fetch too, and a timeout
// there is logged as a timeout, not an auth failure.
test("a token fetch still pending at the timeout rejects with the timeout", async () => {
	const inferenceFetch = createInferenceFetch(CLOUD_URL, {
		onCloudRun: true,
		getAuthHeaders: () => new Promise(() => {}),
	});

	await assert.rejects(
		inferenceFetch(`${CLOUD_URL}/analyze`, {
			signal: AbortSignal.timeout(10),
		}),
		{ name: "TimeoutError" },
	);
	assert.equal(sent.mock.callCount(), 0);
});

test("an already-timed-out call rejects with the timeout without waiting for a token", async () => {
	const inferenceFetch = createInferenceFetch(CLOUD_URL, {
		onCloudRun: true,
		getAuthHeaders: () => new Promise(() => {}),
	});

	await assert.rejects(
		inferenceFetch(`${CLOUD_URL}/analyze`, {
			signal: AbortSignal.abort(new DOMException("timed out", "TimeoutError")),
		}),
		{ name: "TimeoutError" },
	);
});

test("a failed token fetch says why in its message, which is what gets logged", async () => {
	const inferenceFetch = createInferenceFetch(CLOUD_URL, {
		onCloudRun: true,
		getAuthHeaders: async () => {
			throw new Error("permission denied");
		},
	});

	await assert.rejects(inferenceFetch(`${CLOUD_URL}/analyze`), {
		message: /ID token.*permission denied/,
	});
});

// The default token source. The library caches the token on the
// IdTokenClient, so the cache only helps if the same client is reused.
const fakeIdTokenClient = {
	getRequestHeaders: async () => new Headers({ authorization: "Bearer t" }),
};

test("reuses one ID token client across calls, so its token cache applies", async () => {
	const getIdTokenClient = mock.method(
		GoogleAuth.prototype,
		"getIdTokenClient",
		async () => fakeIdTokenClient as unknown as IdTokenClient,
	);
	const inferenceFetch = createInferenceFetch(CLOUD_URL, { onCloudRun: true });

	await inferenceFetch(`${CLOUD_URL}/analyze`);
	await inferenceFetch(`${CLOUD_URL}/analyze`);

	assert.equal(getIdTokenClient.mock.callCount(), 1);
	assert.equal(getIdTokenClient.mock.calls[0]?.arguments[0], CLOUD_URL);
	assert.equal(
		new Headers(sent.mock.calls[1]?.arguments[1]?.headers).get("authorization"),
		"Bearer t",
	);
});

test("a failed attempt to make the ID token client isn't kept: the next call retries", async () => {
	let attempts = 0;
	const getIdTokenClient = mock.method(
		GoogleAuth.prototype,
		"getIdTokenClient",
		async () => {
			if (attempts++ === 0) throw new Error("no credentials yet");
			return fakeIdTokenClient as unknown as IdTokenClient;
		},
	);
	const inferenceFetch = createInferenceFetch(CLOUD_URL, { onCloudRun: true });

	await assert.rejects(
		inferenceFetch(`${CLOUD_URL}/analyze`),
		InferenceAuthError,
	);
	await inferenceFetch(`${CLOUD_URL}/analyze`);

	assert.equal(getIdTokenClient.mock.callCount(), 2);
	assert.equal(sent.mock.callCount(), 1);
});
