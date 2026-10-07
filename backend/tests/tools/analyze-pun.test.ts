import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, type Mock, mock, test } from "node:test";
import { genkit } from "genkit";
import { logger } from "genkit/logging";
import {
	type AnalyzeResult,
	createAnalyzePunTool,
	UNDETERMINED_ANALYZE_RESULT,
} from "../../src/tools/analyze-pun.ts";
import { fixtureFetch } from "../../src/tools/analyze-pun-fixture.ts";
import { InferenceAuthError } from "../../src/tools/inference-fetch.ts";
import { PUN_ANALYZE_RESULT } from "../fixtures/analyze-results.ts";

const INFERENCE_URL = "http://inference.test";

/**
 * analyze_pun registered on a fresh Genkit instance (so re-registering it
 * per test doesn't log overwrite warnings). Calling it runs the tool
 * through Genkit's action wrapper, which validates the output against the
 * tool's outputSchema, as it does when Gemini calls it mid-conversation.
 */
const buildTool = (fetch: typeof globalThis.fetch, timeoutMs?: number) =>
	createAnalyzePunTool(genkit({}), {
		fetch,
		inferenceUrl: INFERENCE_URL,
		timeoutMs,
	});

let warn: Mock<typeof logger.warn>;
beforeEach(() => {
	warn = mock.method(logger, "warn", () => {});
});
afterEach(() => mock.restoreAll());

/** The logged failure cause; fails unless exactly one warning was logged. */
const loggedCause = () => {
	assert.equal(warn.mock.callCount(), 1);
	return warn.mock.calls[0]?.arguments[1].cause;
};

test("POSTs the text to Inference's /analyze and returns its result", async () => {
	const fetch = mock.fn<typeof globalThis.fetch>(async () =>
		Response.json(PUN_ANALYZE_RESULT),
	);
	const analyzePun = buildTool(fetch);

	const result = await analyzePun({ text: "I used to be a banker." });

	assert.deepEqual(result, PUN_ANALYZE_RESULT);
	const [call] = fetch.mock.calls;
	assert.ok(call, "expected Inference to be called");
	const [url, init] = call.arguments;
	assert.equal(String(url), `${INFERENCE_URL}/analyze`);
	assert.equal(init?.method, "POST");
	assert.deepEqual(init?.headers, { "Content-Type": "application/json" });
	assert.equal(init?.body, JSON.stringify({ text: "I used to be a banker." }));
	assert.equal(warn.mock.callCount(), 0);
});

// The limit is written out rather than imported, and Inference's
// tests/test_main.py pins the same 2,000, so changing it on one side alone
// fails a test (docs/contracts.md).
const withinLimit = {
	"2,000 characters": "x".repeat(2000),
	// 4,000 UTF-16 code units, but 2,000 characters to Inference's len().
	"2,000 emoji": "😀".repeat(2000),
};
for (const [name, text] of Object.entries(withinLimit)) {
	test(`sends text of ${name} to Inference`, async () => {
		const fetch = mock.fn<typeof globalThis.fetch>(async () =>
			Response.json(PUN_ANALYZE_RESULT),
		);
		const analyzePun = buildTool(fetch);

		assert.deepEqual(await analyzePun({ text }), PUN_ANALYZE_RESULT);
		assert.equal(fetch.mock.callCount(), 1);
	});
}

const overLimit = {
	"2,001 characters": "x".repeat(2001),
	"2,001 emoji": "😀".repeat(2001),
};
for (const [name, text] of Object.entries(overLimit)) {
	test(`returns the undetermined result for text of ${name}, without calling Inference`, async () => {
		const fetch = mock.fn<typeof globalThis.fetch>(async () =>
			Response.json(PUN_ANALYZE_RESULT),
		);
		const analyzePun = buildTool(fetch);

		assert.deepEqual(await analyzePun({ text }), UNDETERMINED_ANALYZE_RESULT);
		assert.equal(fetch.mock.callCount(), 0);
		assert.equal(loggedCause(), "too_long");
		assert.equal(warn.mock.calls[0]?.arguments[1].characters, 2001);
	});
}

// Each has at least one null field, so these fail Genkit's output
// validation if the schema says .optional() where the contract says null.
const nullableResults: Record<string, AnalyzeResult> = {
	"not a pun": {
		is_pun: false,
		pun_type: null,
		words_involved: [],
		explanation: "",
		confidence: 0.08,
		sense_source: null,
	},
	"a pun only Gemini can explain (llm_fallback)": {
		is_pun: true,
		pun_type: "homophonic",
		words_involved: ["knight"],
		explanation: "",
		confidence: 0.71,
		sense_source: "llm_fallback",
	},
	"Inference's own undetermined result": UNDETERMINED_ANALYZE_RESULT,
	"a pun with class probabilities": {
		...PUN_ANALYZE_RESULT,
		// Sum to 1, and homographic + homophonic is the confidence.
		probabilities: { non_pun: 0.07, homographic: 0.81, homophonic: 0.12 },
	},
	// The field is optional (docs/contracts.md); the case that needs it,
	// history resent from the browser, is in tests/flows/chat.test.ts.
	"a result without probabilities": PUN_ANALYZE_RESULT,
};
for (const [name, inferenceResult] of Object.entries(nullableResults)) {
	test(`passes through ${name} unchanged, without logging a failure`, async () => {
		const analyzePun = buildTool(async () => Response.json(inferenceResult));

		assert.deepEqual(await analyzePun({ text: "..." }), inferenceResult);
		assert.equal(warn.mock.callCount(), 0);
	});
}

/** A fetch that, like the real one, rejects with the signal's reason on abort. */
const hangingFetch: typeof fetch = (_url, init) =>
	new Promise((_resolve, reject) => {
		const signal = init?.signal as AbortSignal;
		signal.addEventListener("abort", () => reject(signal.reason));
	});

/** Sends headers at once, then a body that never finishes until aborted. */
const hangingBodyFetch: typeof fetch = async (_url, init) => {
	const signal = init?.signal as AbortSignal;
	const body = new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode('{"is_pun": '));
			signal.addEventListener("abort", () => controller.error(signal.reason));
		},
	});
	return new Response(body, {
		headers: { "Content-Type": "application/json" },
	});
};

const failures: Array<[string, typeof fetch, string]> = [
	["times out waiting for a response", hangingFetch, "timeout"],
	["times out mid-body", hangingBodyFetch, "timeout"],
	[
		"can't be reached",
		async () => {
			throw new TypeError("fetch failed");
		},
		"unreachable",
	],
	[
		// So the logs point at auth, not networking.
		"can't be authenticated to",
		async () => {
			throw new InferenceAuthError("Could not obtain an ID token");
		},
		"auth",
	],
	[
		"answers non-2xx",
		async () => new Response("Internal Server Error", { status: 500 }),
		"non_2xx",
	],
	[
		"answers with something that isn't JSON",
		async () => new Response("<html>Service Unavailable</html>"),
		"malformed",
	],
	[
		"answers JSON that isn't an /analyze result",
		async () => Response.json({ is_pun: true }),
		"malformed",
	],
	[
		// The contract sends null, not an absent field.
		"leaves out a nullable field",
		async () => {
			const { confidence, ...withoutConfidence } = PUN_ANALYZE_RESULT;
			return Response.json(withoutConfidence);
		},
		"malformed",
	],
	...Object.entries({
		"is_pun without a confidence": { confidence: null },
		"a confidence without is_pun": { is_pun: null },
		"a confidence below 0": { confidence: -0.1 },
		"a sense_source on a non-pun": { is_pun: false },
		"an undetermined result with a pun_type": {
			is_pun: null,
			confidence: null,
			words_involved: [],
			explanation: "",
			sense_source: null,
		},
		"an undetermined result with an explanation": {
			is_pun: null,
			confidence: null,
			pun_type: null,
			words_involved: [],
			sense_source: null,
		},
		"a confidence above 1": { confidence: 1.3 },
		"a pun without a sense_source": { sense_source: null },
		"an llm_fallback with an explanation": { sense_source: "llm_fallback" },
		"probabilities that don't sum to 1": {
			probabilities: { non_pun: 0.2, homographic: 0.81, homophonic: 0.12 },
		},
		"probabilities that disagree with confidence": {
			probabilities: { non_pun: 0.3, homographic: 0.6, homophonic: 0.1 },
		},
		"probabilities on an undetermined result": {
			is_pun: null,
			confidence: null,
			pun_type: null,
			sense_source: null,
			words_involved: [],
			explanation: "",
			// Sums to 1 and agrees with a null confidence read as 0, so only
			// the rule that an undetermined result has none rejects it.
			probabilities: { non_pun: 1, homographic: 0, homophonic: 0 },
		},
		"an undetermined result with words": {
			is_pun: null,
			confidence: null,
			pun_type: null,
			sense_source: null,
			explanation: "",
		},
	}).map(([rule, change]): [string, typeof fetch, string] => [
		`breaks the contract with ${rule}`,
		async () => Response.json({ ...PUN_ANALYZE_RESULT, ...change }),
		"malformed",
	]),
];
for (const [name, fetch, cause] of failures) {
	test(`returns the undetermined result and logs cause=${cause} when Inference ${name}`, async () => {
		const analyzePun = buildTool(fetch, 20);

		assert.deepEqual(
			await analyzePun({ text: "..." }),
			UNDETERMINED_ANALYZE_RESULT,
		);
		assert.equal(loggedCause(), cause);
	});
}

// docs/contracts.md's undetermined result sends every nullable field,
// probabilities included, as null.
test("Backend's undetermined result has probabilities: null", () => {
	assert.ok("probabilities" in UNDETERMINED_ANALYZE_RESULT);
	assert.equal(UNDETERMINED_ANALYZE_RESULT.probabilities, null);
});

test("the stand-in for Inference answers the undetermined result", async () => {
	const analyzePun = buildTool(fixtureFetch);

	assert.deepEqual(
		await analyzePun({ text: "..." }),
		UNDETERMINED_ANALYZE_RESULT,
	);
	// Not an Inference failure, so nothing to warn about.
	assert.equal(warn.mock.callCount(), 0);
});

test("logs the status of a non-2xx response", async () => {
	const analyzePun = buildTool(async () => new Response(null, { status: 503 }));

	await analyzePun({ text: "..." });

	assert.equal(warn.mock.calls[0]?.arguments[1].status, 503);
});

// The fake fetches above assume how the real fetch fails. These pin those
// assumptions against the real fetch and a real (local) server, since
// production's createInferenceFetch wraps the real fetch.
async function listen(
	handler: Parameters<typeof createServer>[1],
): Promise<{ server: Server; url: string }> {
	const server = createServer(handler);
	await new Promise<void>((resolve) => server.listen(0, resolve));
	return {
		server,
		url: `http://localhost:${(server.address() as AddressInfo).port}`,
	};
}

const closeServer = (server: Server) =>
	new Promise<void>((resolve) => {
		server.closeAllConnections();
		server.close(() => resolve());
	});

for (const [name, handler] of [
	["sends nothing", () => {}],
	[
		"stops mid-body",
		(_req, res) => {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.write('{"is_pun": ');
		},
	],
] as const satisfies Array<[string, Parameters<typeof createServer>[1]]>) {
	test(`with the real fetch, a server that ${name} is logged as a timeout`, async () => {
		const { server, url } = await listen(handler);
		try {
			const analyzePun = createAnalyzePunTool(genkit({}), {
				fetch,
				inferenceUrl: url,
				timeoutMs: 50,
			});

			assert.deepEqual(
				await analyzePun({ text: "..." }),
				UNDETERMINED_ANALYZE_RESULT,
			);
			assert.equal(loggedCause(), "timeout");
		} finally {
			await closeServer(server);
		}
	});
}

test("with the real fetch, a closed port is logged as unreachable", async () => {
	const { server, url } = await listen(() => {});
	await closeServer(server);
	const analyzePun = createAnalyzePunTool(genkit({}), {
		fetch,
		inferenceUrl: url,
	});

	assert.deepEqual(
		await analyzePun({ text: "..." }),
		UNDETERMINED_ANALYZE_RESULT,
	);
	assert.equal(loggedCause(), "unreachable");
});
