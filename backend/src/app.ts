import { logger } from "genkit/logging";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config.ts";
import { verifyAppCheckToken } from "./firebase.ts";
import { createChatFlow } from "./flows/chat.ts";
import { ai, chatModel } from "./genkit.ts";
import { appCheck } from "./middleware/app-check.ts";
import { createChatHandler } from "./routes/chat.ts";

export const app = new Hono();

app.use("*", cors({ origin: config.allowedOrigins }));

app.get("/health", (c) => c.json({ status: "ok" }));

// Registered after CORS, so a preflight (which never carries the token) is
// answered before this runs. Covers all of /api/*, so a new endpoint there
// is protected without anyone having to remember it.
if (config.appCheckEnforced) {
	app.use("/api/*", appCheck(verifyAppCheckToken));
} else {
	logger.warn(
		"APP_CHECK=off: /api/* accepts requests without an App Check token. " +
			"For local development only; never set it on a deployed service.",
	);
}

const chatFlow = createChatFlow(ai, chatModel);
app.post("/api/chat", createChatHandler(chatFlow));
