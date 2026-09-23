/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_CHAT_ADAPTER?: "stub" | "live";
	/** Backend base URL; required when VITE_CHAT_ADAPTER is "live". */
	readonly VITE_BACKEND_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
