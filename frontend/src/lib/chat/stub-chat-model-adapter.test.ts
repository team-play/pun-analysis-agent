import type { ChatModelRunOptions, ThreadMessage } from "@assistant-ui/react";
import { describe, expect, it } from "vitest";
import { createStubChatModelAdapter } from "./stub-chat-model-adapter";

const userMessage = (text: string): ThreadMessage => ({
	id: "msg-1",
	createdAt: new Date(),
	role: "user",
	content: [{ type: "text", text }],
	attachments: [],
	metadata: { custom: {} },
});

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

const collect = async <T>(gen: AsyncGenerator<T>): Promise<T[]> => {
	const results: T[] = [];
	for await (const item of gen) results.push(item);
	return results;
};

describe("createStubChatModelAdapter", () => {
	it("streams a plain-text-only response by default (Phase 1 shape)", async () => {
		const adapter = createStubChatModelAdapter();
		const results = await collect(
			adapter.run(runOptions([userMessage("hello there")])) as AsyncGenerator<{
				content: readonly { type: string }[];
			}>,
		);

		expect(results.length).toBeGreaterThan(1);
		for (const step of results) {
			expect(step.content).toHaveLength(1);
			expect(step.content[0]?.type).toBe("text");
		}
		const last = results.at(-1);
		expect(last?.content[0]).toMatchObject({ type: "text" });
	});

	it("streams a text-plus-tool-call response when the message mentions 'pun' (Phase 2 shape)", async () => {
		const adapter = createStubChatModelAdapter();
		const results = await collect(
			adapter.run(
				runOptions([userMessage("got a good pun for me?")]),
			) as AsyncGenerator<{
				content: readonly { type: string; result?: unknown }[];
			}>,
		);

		const toolCallSteps = results.filter((step) =>
			step.content.some((part) => part.type === "tool-call"),
		);
		expect(toolCallSteps.length).toBeGreaterThan(0);

		const runningStep = toolCallSteps[0];
		const toolCallPart = runningStep?.content.find(
			(part) => part.type === "tool-call",
		);
		expect(toolCallPart?.result).toBeUndefined();

		const finalStep = results.at(-1);
		const finalToolCallPart = finalStep?.content.find(
			(part) => part.type === "tool-call",
		);
		expect(finalToolCallPart?.result).toBeDefined();
	});

	it("throws when the message mentions 'error', simulating a failed run", async () => {
		const adapter = createStubChatModelAdapter();
		const gen = adapter.run(
			runOptions([userMessage("please error out")]),
		) as AsyncGenerator<unknown>;

		await expect(collect(gen)).rejects.toThrow(/simulated failure/i);
	});

	it("stops yielding once the abort signal fires", async () => {
		const adapter = createStubChatModelAdapter();
		const controller = new AbortController();
		const gen = adapter.run(
			runOptions([userMessage("hello there")], controller.signal),
		) as AsyncGenerator<unknown>;

		controller.abort();
		await expect(collect(gen)).rejects.toBeDefined();
	});
});
