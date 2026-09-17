import { Hono } from "hono";

export const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

// Genkit's analyze_pun flow will back this route — see src/flows/.
app.post("/api/chat", (c) => c.json({ error: "not implemented" }, 501));
