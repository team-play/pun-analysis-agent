import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { expressHandler } from "@genkit-ai/express";
import express from "express";
import { genkit } from "genkit";
import type { MockRespond } from "genkit/testing";
import { Hono } from "hono";
import { createChatHandler } from "../../src/routes/chat.ts";
import { buildMockChatFlow } from "../helpers/build-mock-chat-flow.ts";

/**
 * `src/routes/chat.ts` hand-replicates Genkit's flow-stream wire format
 * (verified once, by reading `@genkit-ai/express`'s source) rather than
 * depending on it — that package requires Express, which doesn't belong in
 * a Hono project just to reuse one response-writing function.
 *
 * That hand-replication can silently drift on a future Genkit upgrade, so
 * this file pins it: it runs the *real* `@genkit-ai/express` handler
 * (a devDependency, used only here) against the exact same flow/mock model,
 * and asserts our Hono handler's streamed bytes are identical. If Genkit's
 * wire format ever changes, this test — not a production incident — is
 * what catches it.
 */

const input = { messages: [{ role: "user", content: "Tell me a pun" }] };

async function listen(
	app: express.Express,
): Promise<{ server: Server; port: number }> {
	const server = await new Promise<Server>((resolve) => {
		const s = app.listen(0, () => resolve(s));
	});
	return { server, port: (server.address() as AddressInfo).port };
}

function closeServer(server: Server): Promise<void> {
	return new Promise((resolve) => server.close(() => resolve()));
}

/** Streams `input` through the same flow via the real Express handler and ours; returns both bodies. */
async function compareWireBytes(respond: MockRespond) {
	const testAi = genkit({});
	const { chatFlow } = buildMockChatFlow(testAi, { respond });

	const expressApp = express();
	expressApp.use(express.json());
	expressApp.post("/chatFlow", expressHandler(chatFlow));
	const { server, port } = await listen(expressApp);

	try {
		const genkitRes = await fetch(`http://localhost:${port}/chatFlow`, {
			method: "POST",
			headers: {
				Accept: "text/event-stream",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ data: input }),
		});
		const genkitBody = await genkitRes.text();

		const honoApp = new Hono();
		honoApp.post("/api/chat", createChatHandler(chatFlow));
		const honoRes = await honoApp.request("/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(input),
		});
		const honoBody = await honoRes.text();

		return { honoBody, genkitBody };
	} finally {
		await closeServer(server);
	}
}

test("Hono handler's success-path bytes match the real @genkit-ai/express handler's", async () => {
	const { honoBody, genkitBody } = await compareWireBytes(
		(_request, { sendChunk }) => {
			sendChunk("Why did the ");
			sendChunk("otter cross the river? To get to the other side.");
			return {
				text: "Why did the otter cross the river? To get to the other side.",
			};
		},
	);

	assert.equal(honoBody, genkitBody);
});

test("Hono handler's error-path bytes match the real @genkit-ai/express handler's", async () => {
	const { honoBody, genkitBody } = await compareWireBytes(() => {
		throw new Error("Simulated model failure");
	});

	assert.equal(honoBody, genkitBody);
	assert.match(honoBody, /^error: /);
});
