import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { logger } from "genkit/logging";

// The real app with App Check off, so a request gets past it to the Inference
// warm-up (TASK-53). Its own file because config.ts reads APP_CHECK at import,
// and app.test.ts needs App Check on. Every request here has a malformed body,
// which the chat handler rejects before the flow runs, so none reaches Gemini.
process.env.APP_CHECK = "off";
delete process.env.K_SERVICE;
delete process.env.INFERENCE_URL;
// Stands in for Inference, so nothing here reaches the network.
const inferenceFetch = mock.method(globalThis, "fetch", async () =>
	Response.json({ status: "ok" }),
);
// Quiets app.ts's APP_CHECK=off warning.
mock.method(logger, "warn", () => {});
const { app } = await import("../src/app.ts");

test("POST /api/chat on the real app pings Inference's /health once App Check has passed", async () => {
	const res = await app.request("/api/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: "not json",
	});

	assert.equal(res.status, 400);
	assert.equal(inferenceFetch.mock.callCount(), 1);
	const [url] = inferenceFetch.mock.calls[0].arguments;
	assert.equal(String(url), "http://localhost:8000/health");
});
