import type {
	ChatModelAdapter,
	ChatModelRunOptions,
	ThreadMessage,
} from "@assistant-ui/react";
import { phase1TextFixture, phase2ToolCallFixture } from "./fixtures";
import { getMessageText } from "./message-text";

const STEP_DELAY_MS = 15;

/** Trigger phrase for the Phase-2 tool-call fixture, checked case-insensitively. */
const TOOL_CALL_TRIGGER = "pun";
/** Trigger phrase that makes the stub simulate a failed run. */
const ERROR_TRIGGER = "error";

const lastUserText = (messages: readonly ThreadMessage[]): string => {
	const lastUser = messages.findLast((m) => m.role === "user");
	return lastUser ? getMessageText(lastUser) : "";
};

const delay = (ms: number, abortSignal: AbortSignal): Promise<void> =>
	new Promise((resolve, reject) => {
		if (abortSignal.aborted) {
			reject(abortSignal.reason);
			return;
		}
		const timer = setTimeout(resolve, ms);
		abortSignal.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				reject(abortSignal.reason);
			},
			{ once: true },
		);
	});

/**
 * Implements the same `run()` interface as the real (Genkit-backed)
 * ChatModelAdapter, replaying canned fixtures instead of calling
 * `/api/chat`. Picks a fixture from the last user message's text so both
 * the Phase 1 (text-only) and Phase 2 (text + tool-call) shapes are
 * reachable through the real UI: mention "pun" for the tool-call fixture,
 * "error" to simulate a failed run, anything else for the plain-text one.
 */
export const createStubChatModelAdapter = (): ChatModelAdapter => ({
	async *run({ messages, abortSignal }: ChatModelRunOptions) {
		const text = lastUserText(messages).toLowerCase();

		if (text.includes(ERROR_TRIGGER)) {
			await delay(STEP_DELAY_MS, abortSignal);
			throw new Error(
				"Stub adapter: simulated failure (message contained 'error').",
			);
		}

		const fixture = text.includes(TOOL_CALL_TRIGGER)
			? phase2ToolCallFixture
			: phase1TextFixture;

		for (const content of fixture) {
			await delay(STEP_DELAY_MS, abortSignal);
			yield { content };
		}
	},
});
