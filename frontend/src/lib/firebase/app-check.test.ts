import { initializeApp } from "firebase/app";
import {
	getToken,
	initializeAppCheck,
	ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startAppCheck } from "./app-check";

// The real SDK would load reCAPTCHA and call Google.
vi.mock("firebase/app", () => ({
	initializeApp: vi.fn(() => ({ name: "test-app" })),
}));
vi.mock("firebase/app-check", () => ({
	initializeAppCheck: vi.fn(() => ({ name: "test-app-check" })),
	ReCaptchaEnterpriseProvider: vi.fn(),
	getToken: vi.fn(async () => ({ token: "sdk-token" })),
}));

afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllEnvs();
	globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = undefined;
});

describe("startAppCheck", () => {
	it("initializes App Check for the pun-agent project with reCAPTCHA Enterprise and auto-refresh", async () => {
		await startAppCheck()();

		expect(initializeApp).toHaveBeenCalledWith(
			expect.objectContaining({ projectId: "pun-agent" }),
		);
		expect(ReCaptchaEnterpriseProvider).toHaveBeenCalledWith(
			expect.stringMatching(/^6L/),
		);
		expect(initializeAppCheck).toHaveBeenCalledWith(
			{ name: "test-app" },
			expect.objectContaining({ isTokenAutoRefreshEnabled: true }),
		);
	});

	it("resolves to the SDK's current token, from the one App Check instance", async () => {
		const getAppCheckToken = startAppCheck();

		expect(await getAppCheckToken()).toBe("sdk-token");
		expect(await getAppCheckToken()).toBe("sdk-token");

		expect(initializeAppCheck).toHaveBeenCalledOnce();
		expect(getToken).toHaveBeenCalledTimes(2);
		expect(getToken).toHaveBeenCalledWith({ name: "test-app-check" });
	});

	it("starts App Check right away, before any token is asked for", async () => {
		startAppCheck();
		await vi.waitFor(() => expect(initializeAppCheck).toHaveBeenCalled());
	});

	it("passes a failed start on to whoever asks for a token", async () => {
		vi.mocked(initializeAppCheck).mockImplementationOnce(() => {
			throw new Error("AppCheck: already initialized");
		});

		await expect(startAppCheck()()).rejects.toThrow("already initialized");
	});

	it("retries a failed start on the next token request, instead of failing every message until a reload", async () => {
		vi.mocked(initializeAppCheck).mockImplementationOnce(() => {
			throw new Error("Failed to fetch dynamically imported module");
		});
		const getAppCheckToken = startAppCheck();

		await expect(getAppCheckToken()).rejects.toThrow("Failed to fetch");
		expect(await getAppCheckToken()).toBe("sdk-token");
		expect(initializeAppCheck).toHaveBeenCalledTimes(2);
	});

	it("doesn't restart App Check when only getting a token failed", async () => {
		vi.mocked(getToken).mockRejectedValueOnce(new Error("AppCheck: throttled"));
		const getAppCheckToken = startAppCheck();

		await expect(getAppCheckToken()).rejects.toThrow("throttled");
		expect(await getAppCheckToken()).toBe("sdk-token");
		expect(initializeAppCheck).toHaveBeenCalledOnce();
	});

	// Vitest runs with import.meta.env.DEV true, like `pnpm dev`.
	it("in dev, uses the debug token from VITE_APPCHECK_DEBUG_TOKEN", async () => {
		vi.stubEnv("VITE_APPCHECK_DEBUG_TOKEN", "registered-debug-token");

		await startAppCheck()();

		expect(globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN).toBe(
			"registered-debug-token",
		);
	});

	it("in dev without a debug token, has the SDK generate one to register", async () => {
		vi.stubEnv("VITE_APPCHECK_DEBUG_TOKEN", "");

		await startAppCheck()();

		expect(globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN).toBe(true);
	});

	it("outside dev, never switches the SDK to its debug provider", async () => {
		vi.stubEnv("DEV", false);
		vi.stubEnv("VITE_APPCHECK_DEBUG_TOKEN", "registered-debug-token");

		await startAppCheck()();

		expect(globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN).toBeUndefined();
	});
});
