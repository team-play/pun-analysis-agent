import { logger } from "genkit/logging";
import { createMiddleware } from "hono/factory";
import { networkErrorCode } from "../tools/inference-fetch.ts";

/**
 * How often chat requests may ping Inference. Inference scales to zero after
 * it has been idle for a while, and a ping every five minutes while people
 * are chatting keeps it from doing so in the middle of a conversation.
 */
const DEFAULT_INTERVAL_MS = 5 * 60_000;

export interface InferenceWarmupOptions {
	/**
	 * Makes the call to Inference: analyze_pun's fetch from
	 * createInferenceFetch, so the ping carries the same ID token.
	 */
	fetch: typeof fetch;
	/** Inference's base URL (config.inferenceUrl); the ping GETs its /health. */
	inferenceUrl: string;
	intervalMs?: number;
	/** The clock, injected so tests can move it. */
	now?: () => number;
}

/**
 * Sends `GET /health` to Inference when a chat request arrives and no ping
 * has been sent for `intervalMs`, so Inference's cold start runs while
 * Gemini works on its first turn instead of when analyze_pun needs it
 * (TASK-53).
 *
 * The ping is never awaited, so it can't delay or fail the reply. It has no
 * timeout and isn't cancelled when the chat is: Cloud Run starts an
 * instance once the request reaches it, whether or not anyone waits for the
 * answer. Reaching it takes Backend's CPU, though (the ID token, the
 * connection), which Cloud Run only gives Backend during a request: a chat
 * that streams a reply gives it plenty, but one rejected in milliseconds
 * (e.g. a malformed body) may not, and its window still counts.
 *
 * A failed ping is logged, not retried. The log is best-effort for the same
 * reason: an answer still pending when the reply ends is only handled once
 * Backend has CPU again.
 */
export const warmInference = ({
	fetch,
	inferenceUrl,
	intervalMs = DEFAULT_INTERVAL_MS,
	now = Date.now,
}: InferenceWarmupOptions) => {
	const healthUrl = new URL("/health", inferenceUrl);
	// When the last ping was sent, not when it was answered. Inference has a
	// single request slot (one instance, one request at a time), so pings sent
	// by every chat arriving during its cold start would queue there, ahead of
	// the /analyze calls the warm-up is meant to speed up.
	let lastPingAt = Number.NEGATIVE_INFINITY;

	const ping = async () => {
		try {
			const response = await fetch(healthUrl);
			// Unread, the body would hold the connection open until garbage
			// collection.
			await response.body?.cancel();
			if (!response.ok) {
				logger.warn("Inference warm-up ping got a non-2xx answer", {
					status: response.status,
				});
			}
		} catch (err) {
			logger.warn(
				"Inference warm-up ping failed",
				{ errorCode: networkErrorCode(err) },
				err,
			);
		}
	};

	return createMiddleware(async (_c, next) => {
		const requestAt = now();
		if (requestAt - lastPingAt >= intervalMs) {
			lastPingAt = requestAt;
			void ping();
		}
		await next();
	});
};
