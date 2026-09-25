import { logger } from "genkit/logging";
import { createMiddleware } from "hono/factory";

/** Resolves if `token` is a valid App Check token, and throws if it isn't. */
export type AppCheckVerifier = (token: string) => Promise<unknown>;

/**
 * Callers get the same response whatever was wrong with their token
 * (missing, malformed, expired, another project's), so probing the
 * endpoint teaches them nothing. The real reason is logged instead.
 */
const UNAUTHORIZED = { error: "Unauthorized" };

/**
 * Rejects requests that don't carry a valid Firebase App Check token in the
 * `X-Firebase-AppCheck` header (docs/contracts.md), before any later
 * handler runs. `verify` is injected so tests never need real tokens or the
 * network, the same way createChatHandler takes its flow.
 */
export const appCheck = (verify: AppCheckVerifier) =>
	createMiddleware(async (c, next) => {
		const token = c.req.header("X-Firebase-AppCheck");
		if (!token) {
			logger.warn(`${c.req.path} rejected: no App Check token`);
			return c.json(UNAUTHORIZED, 401);
		}

		try {
			await verify(token);
		} catch (err) {
			logger.warn(`${c.req.path} rejected: invalid App Check token`, err);
			return c.json(UNAUTHORIZED, 401);
		}

		// Outside the try, so a later handler's error isn't reported as a 401.
		await next();
	});
