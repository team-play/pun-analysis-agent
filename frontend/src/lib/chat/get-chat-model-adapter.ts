import type { ChatModelAdapter } from "@assistant-ui/react";
import { createLiveChatModelAdapter } from "./live-chat-model-adapter";
import { createStubChatModelAdapter } from "./stub-chat-model-adapter";

/**
 * Selects the ChatModelAdapter at build time via `VITE_CHAT_ADAPTER`.
 * Unset (local dev default, and always in CI/tests) resolves to the stub,
 * per docs/engineering-practices.md's isolation rule; `live` talks to the
 * Backend at `VITE_BACKEND_URL`.
 */
export const getChatModelAdapter = (): ChatModelAdapter => {
	const mode = import.meta.env.VITE_CHAT_ADAPTER ?? "stub";

	switch (mode) {
		case "stub":
			return createStubChatModelAdapter();
		case "live": {
			const backendUrl = import.meta.env.VITE_BACKEND_URL;
			if (!backendUrl) {
				throw new Error(
					"VITE_CHAT_ADAPTER=live needs VITE_BACKEND_URL set to the Backend's " +
						"base URL (e.g. http://localhost:8080) — see frontend/.env.example.",
				);
			}
			// A relative path resolves against the base's last "/", so give the
			// base one: then any path prefix (e.g. https://host/staging) is kept.
			const base = backendUrl.endsWith("/") ? backendUrl : `${backendUrl}/`;
			return createLiveChatModelAdapter(new URL("api/chat", base).href);
		}
		default:
			throw new Error(
				`Unknown VITE_CHAT_ADAPTER value "${mode}" — expected "stub" or "live".`,
			);
	}
};
