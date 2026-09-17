import assert from "node:assert/strict";
import { test } from "node:test";
import { app } from "../src/app.js";

test("GET /health returns ok", async () => {
	const res = await app.request("/health");
	assert.equal(res.status, 200);
	assert.deepEqual(await res.json(), { status: "ok" });
});

test("POST /api/chat is not implemented yet", async () => {
	const res = await app.request("/api/chat", { method: "POST" });
	assert.equal(res.status, 501);
});
