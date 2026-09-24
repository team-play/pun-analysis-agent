import type {
	ChatModelAdapter,
	ChatModelRunOptions,
} from "@assistant-ui/react";
import { parseGenkitFlowStream } from "./genkit-flow-stream";
import { getMessageText } from "./message-text";

/**
 * The real ChatModelAdapter: sends the conversation to Backend's
 * `/api/chat` (docs/contracts.md) and streams Genkit's reply back into
 * assistant-ui. Phase 1 is text-only; `analyze_pun` tool-call events are
 * TASK-10's extension of this same adapter.
 */
export const createLiveChatModelAdapter = (
	chatUrl: string,
): ChatModelAdapter => ({
	async *run({ messages, abortSignal }: ChatModelRunOptions) {
		const response = await fetch(chatUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				messages: messages.map((message) => ({
					role: message.role,
					content: getMessageText(message),
				})),
			}),
			signal: abortSignal,
		});

		if (!response.ok || !response.body) {
			throw new Error(
				`/api/chat returned ${response.status}: ${await response.text()}`,
			);
		}

		// Each `message` is only the newest piece of the reply, but every
		// yield replaces what assistant-ui shows — so yield the running total.
		let text = "";
		for await (const event of parseGenkitFlowStream(response.body)) {
			text = "result" in event ? event.result : text + event.message;
			yield { content: [{ type: "text", text }] };
		}
	},
});
