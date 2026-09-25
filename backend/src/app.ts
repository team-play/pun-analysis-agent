import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config.ts";
import { createChatFlow } from "./flows/chat.ts";
import { ai, chatModel } from "./genkit.ts";
import { createChatHandler } from "./routes/chat.ts";

export const app = new Hono();

app.use("*", cors({ origin: config.allowedOrigins }));

app.get("/health", (c) => c.json({ status: "ok" }));

const chatFlow = createChatFlow(ai, chatModel);
app.post("/api/chat", createChatHandler(chatFlow));
