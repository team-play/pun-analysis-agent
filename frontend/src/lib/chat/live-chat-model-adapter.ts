import type {
	ChatModelAdapter,
	ChatModelRunOptions,
} from "@assistant-ui/react";
import { FlowErrorEvent, parseGenkitFlowStream } from "./genkit-flow-stream";
import { getMessageText } from "./message-text";

// What the chat's error box shows. Whatever actually went wrong goes to the
// console instead, since it's written for developers (e.g. "Failed to fetch").
const NO_REPLY_MESSAGE = "Couldn't get a reply. Please try again.";
const CUT_OFF_MESSAGE =
	"The reply was cut off before it finished. Please try again.";

/**
 * Throws `userMessage` in place of `cause`, logging `cause` for developers.
 * An abort (the user pressed stop) is rethrown untouched: assistant-ui
 * recognizes it and shows a cancelled reply, not an error.
 */
function failWith(
	userMessage: string,
	cause: unknown,
	abortSignal: AbortSignal,
): never {
	if (abortSignal.aborted) throw cause;
	console.error(cause);
	throw new Error(userMessage, { cause });
}

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
		// Failing before a response arrives (offline, Backend down, non-2xx).
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
		}).catch((error: unknown) =>
			failWith(NO_REPLY_MESSAGE, error, abortSignal),
		);

		if (!response.ok || !response.body) {
			const body = await response.text().catch(() => "<unreadable body>");
			failWith(
				NO_REPLY_MESSAGE,
				new Error(`/api/chat returned ${response.status}: ${body}`),
				abortSignal,
			);
		}

		// Failing mid-reply: Backend's own error event is already user-facing;
		// anything else (dropped connection, garbled or missing events) means
		// the reply was cut off.
		let text = "";
		try {
			for await (const event of parseGenkitFlowStream(response.body)) {
				// Each `message` is only the newest piece of the reply, but every
				// yield replaces what assistant-ui shows — so yield the running total.
				text = "result" in event ? event.result : text + event.message;
				yield { content: [{ type: "text", text }] };
			}
		} catch (error) {
			if (error instanceof FlowErrorEvent) throw error;
			failWith(CUT_OFF_MESSAGE, error, abortSignal);
		}
	},
});
