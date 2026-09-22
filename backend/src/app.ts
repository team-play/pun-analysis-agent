import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config.js";
import { createChatFlow } from "./flows/chat.js";
import { ai, chatModel } from "./genkit.js";
import { createChatHandler } from "./routes/chat.js";

export const app = new Hono();

app.use("*", cors({ origin: config.allowedOrigins }));

app.get("/health", (c) => c.json({ status: "ok" }));

const chatFlow = createChatFlow(ai, chatModel);
app.post("/api/chat", createChatHandler(chatFlow));
