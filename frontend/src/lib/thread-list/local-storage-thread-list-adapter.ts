import type { AsyncStorageLike } from "@assistant-ui/core/react";
import { createLocalStorageAdapter } from "@assistant-ui/core/react";
import type { RemoteThreadListAdapter } from "@assistant-ui/react";

const STORAGE_PREFIX = "pun-agent:";

/** Adapts the browser's synchronous `localStorage` to assistant-ui's async storage contract. */
export const browserLocalStorage: AsyncStorageLike = {
	async getItem(key) {
		return window.localStorage.getItem(key);
	},
	async setItem(key, value) {
		window.localStorage.setItem(key, value);
	},
	async removeItem(key) {
		window.localStorage.removeItem(key);
	},
};

/**
 * A `RemoteThreadListAdapter` (thread metadata) plus per-thread
 * `ThreadHistoryAdapter` (message history), both backed by `storage` —
 * `window.localStorage` by default, no server persistence. Wraps
 * assistant-ui's own `createLocalStorageAdapter` rather than
 * reimplementing it: `initialize()` only writes a thread into the stored
 * list the first time it's called, which the history adapter triggers on
 * the first message append, so an untouched "New Chat" never accumulates.
 */
export const createBrowserThreadListAdapter = (
	storage: AsyncStorageLike = browserLocalStorage,
): RemoteThreadListAdapter =>
	createLocalStorageAdapter({ storage, prefix: STORAGE_PREFIX });
