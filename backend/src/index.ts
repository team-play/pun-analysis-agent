import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { config } from "./config.js";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

// Genkit's analyze_pun flow will back this route — see src/flows/.
app.post("/api/chat", (c) => c.json({ error: "not implemented" }, 501));

serve({ fetch: app.fetch, port: config.port }, (info) => {
	console.log(`backend listening on http://localhost:${info.port}`);
});
