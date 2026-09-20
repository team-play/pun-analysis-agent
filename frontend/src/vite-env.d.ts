/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_CHAT_ADAPTER?: "stub" | "live";
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
