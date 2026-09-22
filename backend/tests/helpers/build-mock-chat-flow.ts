import type { Genkit } from "genkit";
import { type MockModelOptions, mockModel } from "genkit/testing";
import { createChatFlow } from "../../src/flows/chat.js";

/** Pairs a mockModel with a chatFlow built on it, on the given registry. */
export function buildMockChatFlow(ai: Genkit, options?: MockModelOptions) {
	const model = mockModel(ai, options);
	return { model, chatFlow: createChatFlow(ai, model) };
}
