import type { AsyncStorageLike } from "@assistant-ui/core/react";

/** In-memory stand-in for `AsyncStorageLike`, for unit tests that shouldn't touch real localStorage. */
export const createFakeAsyncStorage = (): AsyncStorageLike => {
	const store = new Map<string, string>();
	return {
		async getItem(key) {
			return store.get(key) ?? null;
		},
		async setItem(key, value) {
			store.set(key, value);
		},
		async removeItem(key) {
			store.delete(key);
		},
	};
};
