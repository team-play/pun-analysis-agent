import type { ChatModelRunOptions } from "@assistant-ui/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { recordedPhase1Stream } from "./fixtures/recorded-genkit-streams";
import { getChatModelAdapter } from "./get-chat-model-adapter";

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

const runOnce = async () => {
	const gen = getChatModelAdapter().run({
		messages: [],
		abortSignal: new AbortController().signal,
	} as unknown as ChatModelRunOptions) as AsyncGenerator<unknown>;
	for await (const _ of gen);
};

describe("getChatModelAdapter", () => {
	it.each(["http://localhost:8080", "http://localhost:8080/"])(
		"live mode posts to /api/chat on VITE_BACKEND_URL=%s",
		async (backendUrl) => {
			vi.stubEnv("VITE_CHAT_ADAPTER", "live");
			vi.stubEnv("VITE_BACKEND_URL", backendUrl);
			const fetchMock = vi
				.fn()
				.mockResolvedValue(new Response(recordedPhase1Stream));
			vi.stubGlobal("fetch", fetchMock);

			await runOnce();

			expect(fetchMock).toHaveBeenCalledWith(
				"http://localhost:8080/api/chat",
				expect.anything(),
			);
		},
	);

	it("live mode without VITE_BACKEND_URL fails fast, naming the missing variable", () => {
		vi.stubEnv("VITE_CHAT_ADAPTER", "live");
		vi.stubEnv("VITE_BACKEND_URL", "");
		expect(() => getChatModelAdapter()).toThrow(/VITE_BACKEND_URL/);
	});
});
