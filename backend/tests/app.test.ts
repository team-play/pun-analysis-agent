import assert from "node:assert/strict";
import { test } from "node:test";
import { app } from "../src/app.ts";

test("GET /health returns ok", async () => {
	const res = await app.request("/health");
	assert.equal(res.status, 200);
	assert.deepEqual(await res.json(), { status: "ok" });
});

test("CORS allows the Frontend dev origin (localhost:5173)", async () => {
	const res = await app.request("/health", {
		headers: { Origin: "http://localhost:5173" },
	});
	assert.equal(
		res.headers.get("access-control-allow-origin"),
		"http://localhost:5173",
	);
});

// Firebase Hosting serves the same site on both domains.
for (const origin of [
	"https://pun-agent.web.app",
	"https://pun-agent.firebaseapp.com",
]) {
	test(`CORS allows the deployed Firebase Hosting origin ${origin}`, async () => {
		const res = await app.request("/health", { headers: { Origin: origin } });
		assert.equal(res.headers.get("access-control-allow-origin"), origin);
	});
}

test("CORS omits the allow-origin header for an unlisted origin", async () => {
	const res = await app.request("/health", {
		headers: { Origin: "https://evil.example" },
	});
	assert.equal(res.headers.get("access-control-allow-origin"), null);
});

test("CORS preflight succeeds for POST /api/chat on the real app (wiring only — never invokes the flow, so no live Gemini call)", async () => {
	const res = await app.request("/api/chat", {
		method: "OPTIONS",
		headers: {
			Origin: "http://localhost:5173",
			"Access-Control-Request-Method": "POST",
			"Access-Control-Request-Headers": "content-type",
		},
	});
	assert.equal(
		res.headers.get("access-control-allow-origin"),
		"http://localhost:5173",
	);
	assert.match(res.headers.get("access-control-allow-methods") ?? "", /POST/);
});

// Frontend sends its App Check token in a custom header, which a browser
// only sends if the preflight allows it.
test("CORS preflight allows the X-Firebase-AppCheck header on /api/chat", async () => {
	const res = await app.request("/api/chat", {
		method: "OPTIONS",
		headers: {
			Origin: "https://pun-agent.web.app",
			"Access-Control-Request-Method": "POST",
			"Access-Control-Request-Headers": "content-type,x-firebase-appcheck",
		},
	});
	assert.match(
		res.headers.get("access-control-allow-headers") ?? "",
		/x-firebase-appcheck/i,
	);
});

test("POST /api/chat on the real app rejects a request with no App Check token (never reaches the flow, so no live Gemini call)", async () => {
	const res = await app.request("/api/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
	});
	assert.equal(res.status, 401);
});
