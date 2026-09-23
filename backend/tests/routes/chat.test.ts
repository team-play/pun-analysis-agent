import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { genkit } from "genkit";
import { Hono } from "hono";
import { createChatHandler } from "../../src/routes/chat.ts";
import { buildMockChatFlow } from "../helpers/build-mock-chat-flow.ts";

// Registered once per genkit/testing's mockModel/reset() idiom — see
// tests/flows/chat.test.ts for why.
const testAi = genkit({});
const { model, chatFlow } = buildMockChatFlow(testAi);
const app = new Hono();
app.post("/api/chat", createChatHandler(chatFlow));

beforeEach(() => model.reset());

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
