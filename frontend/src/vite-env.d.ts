/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_CHAT_ADAPTER?: "stub" | "live";
	/** Backend base URL; required when VITE_CHAT_ADAPTER is "live". */
	readonly VITE_BACKEND_URL?: string;
	/** App Check debug token for `pnpm dev` (docs/local-setup.md); dev only. */
	readonly VITE_APPCHECK_DEBUG_TOKEN?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
