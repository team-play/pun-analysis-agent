import type { ChatModelAdapter } from "@assistant-ui/react";
import { createStubChatModelAdapter } from "./stub-chat-model-adapter";

/**
 * Selects the ChatModelAdapter at build time via `VITE_CHAT_ADAPTER`.
 * Unset (local dev default, and always in CI/tests) resolves to the stub,
 * per docs/engineering-practices.md's isolation rule.
 */
export const getChatModelAdapter = (): ChatModelAdapter => {
	const mode = import.meta.env.VITE_CHAT_ADAPTER ?? "stub";

	switch (mode) {
		case "stub":
			return createStubChatModelAdapter();
		case "live":
			throw new Error(
				"VITE_CHAT_ADAPTER=live has no adapter yet — the real Genkit-backed " +
					"ChatModelAdapter lands in TASK-8. Use VITE_CHAT_ADAPTER=stub (or " +
					"unset) until then.",
			);
		default:
			throw new Error(
				`Unknown VITE_CHAT_ADAPTER value "${mode}" — expected "stub" or "live".`,
			);
	}
};
