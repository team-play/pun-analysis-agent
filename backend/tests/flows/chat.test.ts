import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { genkit } from "genkit";
import { buildMockChatFlow } from "../helpers/build-mock-chat-flow.js";

/**
 * A throwaway Genkit instance with no googleAI plugin, so this file never
 * touches real Gemini or needs GEMINI_API_KEY — per
 * docs/engineering-practices.md's "Backend in isolation" section.
 *
 * Registered once (rather than per test) per genkit/testing's own
 * mockModel/reset() idiom, since re-registering under the same name on
 * every call logs registry-overwrite warnings.
 */
const testAi = genkit({});
const { model, chatFlow } = buildMockChatFlow(testAi);

beforeEach(() => model.reset());

test("chatFlow streams the model's chunks and resolves to the full text", async () => {
	model.respondWith((_request, { sendChunk }) => {
		sendChunk("Hello, ");
		sendChunk("pun-agent!");
		return { text: "Hello, pun-agent!" };
	});

	const { stream, output } = chatFlow.stream({
		messages: [{ role: "user", content: "Hi" }],
	});

	const chunks: string[] = [];
	for await (const chunk of stream) {
		chunks.push(chunk);
	}

	assert.deepEqual(chunks, ["Hello, ", "pun-agent!"]);
	assert.equal(await output, "Hello, pun-agent!");
});

test("chatFlow maps assistant-ui's 'assistant' role to Genkit's 'model' role", async () => {
	model.respondWith("ok");

	await chatFlow({
		messages: [
			{ role: "user", content: "What is a pun?" },
			{ role: "assistant", content: "A play on words." },
			{ role: "user", content: "Give me one." },
		],
	});

	assert.deepEqual(
		model.lastRequest?.messages.map((m) => m.role),
		["user", "model", "user"],
	);
});

test("chatFlow has no tool-calling wired up (Phase 1: plain conversational proxy)", async () => {
	model.respondWith("ok");

	await chatFlow({ messages: [{ role: "user", content: "Hi" }] });

	assert.deepEqual(model.lastRequest?.tools ?? [], []);
});
