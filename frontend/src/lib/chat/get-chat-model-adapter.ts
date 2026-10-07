import type { ChatModelAdapter } from "@assistant-ui/react";
import { startAppCheck } from "@/lib/firebase/app-check";
import { createLiveChatModelAdapter } from "./live-chat-model-adapter";
import { createStubChatModelAdapter } from "./stub-chat-model-adapter";

/**
 * Selects the ChatModelAdapter at build time via `VITE_CHAT_ADAPTER`.
 * Unset (local dev default, and always in tests) resolves to the stub,
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
			const chatUrl = new URL("api/chat", base).href;
			// VITE_APP_CHECK=off lets a contributor chat with a local Backend
			// running APP_CHECK=off without the team's debug token
			// (docs/local-setup.md). Only the exact value `off` skips it, as with
			// Backend's switch. `vite build` replaces import.meta.env.DEV with
			// `false`, so production bundles drop this branch. Keep the condition
			// inline: moved into a helper function, the minifier keeps the branch.
			// CI greps production bundles for "VITE_APP_CHECK=off", from the
			// warning below, to check this.
			if (import.meta.env.DEV && import.meta.env.VITE_APP_CHECK === "off") {
				console.warn(
					"VITE_APP_CHECK=off: sending /api/chat without an App Check token. " +
						"Only a local Backend with APP_CHECK=off accepts these requests.",
				);
				return createLiveChatModelAdapter(chatUrl);
			}
			return createLiveChatModelAdapter(chatUrl, startAppCheck());
		}
		default:
			throw new Error(
				`Unknown VITE_CHAT_ADAPTER value "${mode}" — expected "stub" or "live".`,
			);
	}
};
