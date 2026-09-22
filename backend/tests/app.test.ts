import assert from "node:assert/strict";
import { test } from "node:test";
import { app } from "../src/app.js";

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

test("CORS allows the deployed Firebase Hosting origin", async () => {
	const res = await app.request("/health", {
		headers: { Origin: "https://pun-agent.web.app" },
	});
	assert.equal(
		res.headers.get("access-control-allow-origin"),
		"https://pun-agent.web.app",
	);
});

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
