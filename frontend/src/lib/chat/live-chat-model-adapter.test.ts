import type {
	ChatModelRunOptions,
	ChatModelRunResult,
	ThreadMessage,
} from "@assistant-ui/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { byteStreamOf, utf8 } from "./fixtures/byte-stream";
import {
	recordedErrorStream,
	recordedPhase1Stream,
} from "./fixtures/recorded-genkit-streams";
import { createLiveChatModelAdapter } from "./live-chat-model-adapter";

const CHAT_URL = "http://backend.test/api/chat";

const message = (
	role: "user" | "assistant",
	...texts: string[]
): ThreadMessage =>
	({
		id: `${role}-${texts[0]}`,
		createdAt: new Date(),
		role,
		content: texts.map((text) => ({ type: "text", text })),
		attachments: [],
		metadata: { custom: {} },
		...(role === "assistant" && { status: { type: "complete" } }),
	}) as ThreadMessage;

const runOptions = (
	messages: readonly ThreadMessage[],
	abortSignal: AbortSignal = new AbortController().signal,
): ChatModelRunOptions => ({
	messages,
	runConfig: {},
	abortSignal,
	context: {},
	unstable_getMessage: () => messages[messages.length - 1],
});

const run = (messages: readonly ThreadMessage[], abortSignal?: AbortSignal) =>
	createLiveChatModelAdapter(CHAT_URL).run(
		runOptions(messages, abortSignal),
	) as AsyncGenerator<ChatModelRunResult>;

const textOf = (result: ChatModelRunResult | undefined) => {
	const part = result?.content?.[0];
	return part?.type === "text" ? part.text : undefined;
};

const collectTexts = async (gen: AsyncGenerator<ChatModelRunResult>) => {
	const texts: (string | undefined)[] = [];
	for await (const result of gen) texts.push(textOf(result));
	return texts;
};

const mockFetch = (response: Response) => {
	const fetchMock = vi.fn().mockResolvedValue(response);
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("createLiveChatModelAdapter", () => {
	it("POSTs the conversation in docs/contracts.md's /api/chat shape", async () => {
		const fetchMock = mockFetch(new Response(recordedPhase1Stream));
		const controller = new AbortController();

		await collectTexts(
			run(
				[
					message("user", "Tell me a pun"),
					message("assistant", "Why did the baker quit?"),
					message("user", "Why?", "Explain it."),
				],
				controller.signal,
			),
		);

		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe(CHAT_URL);
		expect(init.method).toBe("POST");
		expect(init.signal).toBe(controller.signal);
		expect(JSON.parse(init.body as string)).toEqual({
			messages: [
				{ role: "user", content: "Tell me a pun" },
				{ role: "assistant", content: "Why did the baker quit?" },
				{ role: "user", content: "Why?\n\nExplain it." },
			],
		});
	});

	it("yields the accumulated reply after every chunk, ending on the result's text", async () => {
		mockFetch(new Response(recordedPhase1Stream));

		const texts = await collectTexts(run([message("user", "hi")]));

		const first =
			'¿Qué le dijo una piñata a otra antes de la fiesta?: "¡No te rajes!" ';
		expect(texts[0]).toBe(first);
		// Each yield replaces the previous one in assistant-ui, so every
		// snapshot must contain everything before it, not just the new chunk.
		for (let i = 1; i < texts.length; i++) {
			expect(texts[i]?.startsWith(texts[i - 1] ?? "")).toBe(true);
		}
		expect(texts).toHaveLength(4);
		expect(texts.at(-1)).toContain(
			'literally translates to "don\'t split open."',
		);
	});

	it("yields each chunk as it arrives, before the stream has finished", async () => {
		let push!: ReadableStreamDefaultController<Uint8Array>;
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				push = controller;
			},
		});
		mockFetch(new Response(body));
		const gen = run([message("user", "hi")]);

		push.enqueue(utf8('data: {"message":"Why did"}\n\n'));
		expect(textOf((await gen.next()).value)).toBe("Why did");

		push.enqueue(utf8('data: {"message":" the baker"}\n\n'));
		expect(textOf((await gen.next()).value)).toBe("Why did the baker");

		push.enqueue(utf8('data: {"result":"Why did the baker"}\n\n'));
		push.close();
		expect(textOf((await gen.next()).value)).toBe("Why did the baker");
		expect((await gen.next()).done).toBe(true);
	});

	it("throws on a non-2xx response, e.g. a rejected request body", async () => {
		mockFetch(new Response('{"error":"Invalid JSON body"}', { status: 400 }));
		await expect(collectTexts(run([message("user", "hi")]))).rejects.toThrow(
			/400/,
		);
	});

	it("throws on an error event in the body, even though the status was 200", async () => {
		mockFetch(new Response(recordedErrorStream));
		await expect(collectTexts(run([message("user", "hi")]))).rejects.toThrow(
			/INVALID_ARGUMENT/,
		);
	});

	it("yields the text streamed so far, then throws, when an error event follows chunks", async () => {
		mockFetch(
			new Response(
				'data: {"message":"Why did"}\n\n' +
					'data: {"message":" the baker"}\n\n' +
					recordedErrorStream,
			),
		);
		const gen = run([message("user", "hi")]);

		expect(textOf((await gen.next()).value)).toBe("Why did");
		expect(textOf((await gen.next()).value)).toBe("Why did the baker");
		await expect(gen.next()).rejects.toThrow(/INVALID_ARGUMENT/);
	});

	it("throws if the reply is cut off before its result event", async () => {
		const cutOff = recordedPhase1Stream.slice(
			0,
			recordedPhase1Stream.indexOf('data: {"result"'),
		);
		mockFetch(new Response(byteStreamOf([utf8(cutOff)])));
		await expect(collectTexts(run([message("user", "hi")]))).rejects.toThrow(
			/ended before its final result/,
		);
	});
});
