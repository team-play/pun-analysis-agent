import { getCallableJSON } from "genkit/context";
import type { Context } from "hono";
import { stream as honoStream } from "hono/streaming";
import { chatInputSchema, type createChatFlow } from "../flows/chat.ts";

type ChatFlow = ReturnType<typeof createChatFlow>;

/**
 * Streams `flow`'s output back in Genkit's own flow-stream wire format
 * (`data: {"message": ...}\n\n` chunks, then a final `data: {"result": ...}\n\n`)
 * per docs/contracts.md — verified against @genkit-ai/express's real
 * `expressHandler` source rather than assumed, since Hono has no built-in
 * equivalent. `flow` is injected so production wiring (app.ts) and tests
 * (a flow built on a mock model) share this same handler code.
 */
export function createChatHandler(flow: ChatFlow) {
	return async (c: Context) => {
		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "Invalid JSON body" }, 400);
		}

		const parsed = chatInputSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 400);
		}

		c.header("Content-Type", "text/plain; charset=utf-8");
		c.header("Transfer-Encoding", "chunked");

		return honoStream(c, async (writer) => {
			try {
				const { stream: chunks, output } = flow.stream(parsed.data, {
					abortSignal: c.req.raw.signal,
				});
				for await (const chunk of chunks) {
					await writer.write(`data: ${JSON.stringify({ message: chunk })}\n\n`);
				}
				const result = await output;
				await writer.write(`data: ${JSON.stringify({ result })}\n\n`);
			} catch (err) {
				// getCallableJSON matches Genkit's own error wire shape, and —
				// for anything that isn't a recognized GenkitError — genericizes
				// it to {status:"INTERNAL", message:"Internal Error"} rather than
				// leaking an arbitrary exception's message to the client.
				await writer.write(
					`error: ${JSON.stringify({ error: getCallableJSON(err) })}\n\n`,
				);
			}
		});
	};
}
