import type { Genkit, ModelArgument } from "genkit";
import { z } from "genkit";

/**
 * Matches docs/contracts.md's /api/chat request shape. `role` is
 * intentionally not a strict enum: assistant-ui's ThreadMessage roles
 * ("user" | "assistant" | "system") are what Frontend actually sends, but
 * this schema stays exactly as permissive as the contract it implements.
 */
export const chatInputSchema = z.object({
	messages: z.array(
		z.object({
			role: z.string(),
			content: z.string(),
		}),
	),
});

export type ChatInput = z.infer<typeof chatInputSchema>;

type GenkitRole = "user" | "model" | "system";

/** Genkit uses "model" where chat UIs conventionally say "assistant". */
const GENKIT_ROLE_BY_INPUT_ROLE: Record<string, GenkitRole> = {
	assistant: "model",
	system: "system",
};

const toGenkitRole = (role: string): GenkitRole =>
	GENKIT_ROLE_BY_INPUT_ROLE[role] ?? "user";

const toGenkitMessages = (messages: ChatInput["messages"]) =>
	messages.map((message) => ({
		role: toGenkitRole(message.role),
		content: [{ text: message.content }],
	}));

/**
 * Builds the Phase 1 chat flow: a plain conversational proxy to `model`, no
 * tool-calling. Takes `ai`/`model` as parameters (rather than importing the
 * production instance directly) so tests can substitute a Genkit test-double
 * model without touching real Gemini, per docs/engineering-practices.md's
 * "Backend in isolation" section.
 */
export function createChatFlow(ai: Genkit, model: ModelArgument) {
	return ai.defineFlow(
		{
			name: "chatFlow",
			inputSchema: chatInputSchema,
			outputSchema: z.string(),
			streamSchema: z.string(),
		},
		async (input, { sendChunk }) => {
			const { stream, response } = ai.generateStream({
				model,
				messages: toGenkitMessages(input.messages),
			});
			for await (const chunk of stream) {
				sendChunk(chunk.text);
			}
			return (await response).text;
		},
	);
}
