import type {
	ChatModelRunOptions,
	ChatModelRunResult,
	ThreadMessage,
} from "@assistant-ui/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { byteStreamOf, utf8 } from "./fixtures/byte-stream";
import {
	recordedErrorStream,
	recordedPhase1Stream,
} from "./fixtures/recorded-genkit-streams";
import { createLiveChatModelAdapter } from "./live-chat-model-adapter";

const CHAT_URL = "http://backend.test/api/chat";
/** The user-facing message in recordedErrorStream, shown as-is. */
const RECORDED_ERROR_MESSAGE = "Something went wrong. Please try again.";

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
	vi.restoreAllMocks();
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

	describe("when the reply fails", () => {
		const NO_REPLY = "Couldn't get a reply. Please try again.";
		const CUT_OFF =
			"The reply was cut off before it finished. Please try again.";

		let logError: ReturnType<typeof vi.spyOn>;
		beforeEach(() => {
			logError = vi.spyOn(console, "error").mockImplementation(() => {});
		});

		const failureOf = (gen: AsyncGenerator<ChatModelRunResult>) =>
			collectTexts(gen).then(
				() => {
					throw new Error("expected the run to fail");
				},
				(error: unknown) => error as Error,
			);

		it("shows a user-facing message when the request can't be made, logging the real cause", async () => {
			const offline = new TypeError("Failed to fetch");
			vi.stubGlobal("fetch", vi.fn().mockRejectedValue(offline));

			const error = await failureOf(run([message("user", "hi")]));

			expect(error.message).toBe(NO_REPLY);
			expect(logError).toHaveBeenCalledWith(offline);
		});

		it("shows a user-facing message on a non-2xx response, logging its status and body", async () => {
			mockFetch(new Response('{"error":"Invalid JSON body"}', { status: 400 }));

			const error = await failureOf(run([message("user", "hi")]));

			expect(error.message).toBe(NO_REPLY);
			const [logged] = logError.mock.calls[0] ?? [];
			expect(String(logged)).toContain('400: {"error":"Invalid JSON body"}');
		});

		it("still shows the user-facing message when a non-2xx body can't be read", async () => {
			const unreadable = new ReadableStream({
				start(controller) {
					controller.error(new TypeError("network error"));
				},
			});
			mockFetch(new Response(unreadable, { status: 502 }));

			const error = await failureOf(run([message("user", "hi")]));

			expect(error.message).toBe(NO_REPLY);
		});

		it("shows an error event's message as-is, even though the status was 200", async () => {
			mockFetch(new Response(recordedErrorStream));

			const error = await failureOf(run([message("user", "hi")]));

			expect(error.message).toBe(RECORDED_ERROR_MESSAGE);
		});

		it("logs an error event's status for developers, since the message shown drops it", async () => {
			mockFetch(new Response(recordedErrorStream));

			const error = await failureOf(run([message("user", "hi")]));

			expect(logError).toHaveBeenCalledWith(
				expect.stringContaining("INVALID_ARGUMENT"),
				error,
			);
		});

		it("yields the text streamed so far, then fails, when an error event follows chunks", async () => {
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
			await expect(gen.next()).rejects.toMatchObject({
				message: RECORDED_ERROR_MESSAGE,
			});
		});

		it("says the reply was cut off when the stream ends before its result", async () => {
			const cutOff = recordedPhase1Stream.slice(
				0,
				recordedPhase1Stream.indexOf('data: {"result"'),
			);
			mockFetch(new Response(byteStreamOf([utf8(cutOff)])));

			const error = await failureOf(run([message("user", "hi")]));

			expect(error.message).toBe(CUT_OFF);
			expect(String(logError.mock.calls[0]?.[0])).toMatch(
				/ended before its final result/,
			);
		});

		it("yields the text so far, then says the reply was cut off, when the connection drops mid-reply", async () => {
			let reads = 0;
			const dropsMidReply = new ReadableStream<Uint8Array>({
				pull(controller) {
					if (reads++ === 0) {
						controller.enqueue(utf8('data: {"message":"Why did"}\n\n'));
					} else {
						controller.error(new TypeError("network error"));
					}
				},
			});
			mockFetch(new Response(dropsMidReply));
			const gen = run([message("user", "hi")]);

			expect(textOf((await gen.next()).value)).toBe("Why did");
			await expect(gen.next()).rejects.toMatchObject({ message: CUT_OFF });
		});

		it("says the reply was cut off when an event is garbled", async () => {
			mockFetch(
				new Response('data: {"message":"Why did"}\n\ndata: <html>\n\n'),
			);

			const error = await failureOf(run([message("user", "hi")]));

			expect(error.message).toBe(CUT_OFF);
		});

		it("rethrows an abort untouched, so assistant-ui treats it as a cancel, not a failure", async () => {
			const controller = new AbortController();
			controller.abort();
			vi.stubGlobal(
				"fetch",
				vi.fn().mockRejectedValue(controller.signal.reason),
			);

			const error = await failureOf(
				run([message("user", "hi")], controller.signal),
			);

			expect(error.name).toBe("AbortError");
			expect(logError).not.toHaveBeenCalled();
		});

		it("rethrows an abort untouched when the user stops mid-reply", async () => {
			const controller = new AbortController();
			let reads = 0;
			const stoppedMidReply = new ReadableStream<Uint8Array>({
				pull(stream) {
					if (reads++ === 0) {
						stream.enqueue(utf8('data: {"message":"Why did"}\n\n'));
					} else {
						controller.abort();
						stream.error(controller.signal.reason);
					}
				},
			});
			mockFetch(new Response(stoppedMidReply));
			const gen = run([message("user", "hi")], controller.signal);

			expect(textOf((await gen.next()).value)).toBe("Why did");
			await expect(gen.next()).rejects.toMatchObject({ name: "AbortError" });
			expect(logError).not.toHaveBeenCalled();
		});

		it("rethrows an abort untouched when the user stops while a non-2xx body is read", async () => {
			const controller = new AbortController();
			const stoppedWhileReading = new ReadableStream<Uint8Array>({
				pull(stream) {
					controller.abort();
					stream.error(controller.signal.reason);
				},
			});
			mockFetch(new Response(stoppedWhileReading, { status: 500 }));

			const error = await failureOf(
				run([message("user", "hi")], controller.signal),
			);

			expect(error.name).toBe("AbortError");
			expect(logError).not.toHaveBeenCalled();
		});

		it("rethrows an AbortError untouched even when it isn't the signal's reason", async () => {
			const controller = new AbortController();
			controller.abort("user pressed stop");
			// Some fetch implementations reject with a fresh AbortError instead.
			const abortError = new DOMException("aborted", "AbortError");
			vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

			const error = await failureOf(
				run([message("user", "hi")], controller.signal),
			);

			expect(error).toBe(abortError);
			expect(logError).not.toHaveBeenCalled();
		});

		it("still shows the user-facing message for a real error that races the user's stop", async () => {
			const controller = new AbortController();
			controller.abort();
			const offline = new TypeError("Failed to fetch");
			vi.stubGlobal("fetch", vi.fn().mockRejectedValue(offline));

			const error = await failureOf(
				run([message("user", "hi")], controller.signal),
			);

			expect(error.message).toBe(NO_REPLY);
			expect(logError).toHaveBeenCalledWith(offline);
		});
	});
});
