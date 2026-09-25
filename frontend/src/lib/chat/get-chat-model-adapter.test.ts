import type { ChatModelRunOptions } from "@assistant-ui/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startAppCheck } from "@/lib/firebase/app-check";
import { recordedPhase1Stream } from "./fixtures/recorded-genkit-streams";
import { getChatModelAdapter } from "./get-chat-model-adapter";

// The real module loads Firebase and reCAPTCHA over the network.
vi.mock("@/lib/firebase/app-check", () => ({
	startAppCheck: vi.fn(() => async () => "test-app-check-token"),
}));

afterEach(() => {
	vi.clearAllMocks();
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
	it.each([
		["http://localhost:8080", "http://localhost:8080/api/chat"],
		["http://localhost:8080/", "http://localhost:8080/api/chat"],
		["https://host/staging-v2", "https://host/staging-v2/api/chat"],
		["https://host/staging-v2/", "https://host/staging-v2/api/chat"],
	])(
		"live mode with VITE_BACKEND_URL=%s posts to %s",
		async (backendUrl, chatUrl) => {
			vi.stubEnv("VITE_CHAT_ADAPTER", "live");
			vi.stubEnv("VITE_BACKEND_URL", backendUrl);
			const fetchMock = vi
				.fn()
				.mockResolvedValue(new Response(recordedPhase1Stream));
			vi.stubGlobal("fetch", fetchMock);

			await runOnce();

			expect(fetchMock).toHaveBeenCalledWith(chatUrl, expect.anything());
		},
	);

	it("live mode without VITE_BACKEND_URL fails fast, naming the missing variable", () => {
		vi.stubEnv("VITE_CHAT_ADAPTER", "live");
		vi.stubEnv("VITE_BACKEND_URL", "");
		expect(() => getChatModelAdapter()).toThrow(/VITE_BACKEND_URL/);
	});

	it("live mode sends the App Check token with the request", async () => {
		vi.stubEnv("VITE_CHAT_ADAPTER", "live");
		vi.stubEnv("VITE_BACKEND_URL", "http://localhost:8080");
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(recordedPhase1Stream));
		vi.stubGlobal("fetch", fetchMock);

		await runOnce();

		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(new Headers(init.headers).get("X-Firebase-AppCheck")).toBe(
			"test-app-check-token",
		);
	});

	it("stub mode never starts App Check, so it never loads Firebase or reCAPTCHA", () => {
		vi.stubEnv("VITE_CHAT_ADAPTER", "stub");
		getChatModelAdapter();
		expect(startAppCheck).not.toHaveBeenCalled();
	});
});
