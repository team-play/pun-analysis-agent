import type { ThreadMessage } from "@assistant-ui/react";
import { describe, expect, it } from "vitest";
import { exportThread } from "./export-thread";
import {
	type ChatFixtureStep,
	phase1TextFixture,
	phase2ToolCallFixture,
} from "./fixtures";
import { punResult } from "./fixtures/analyze-results";

const userMessage = (text: string): ThreadMessage =>
	({
		id: "user-1",
		createdAt: new Date(),
		role: "user",
		content: [{ type: "text", text }],
		attachments: [],
		metadata: { custom: {} },
	}) as unknown as ThreadMessage;

const assistantMessage = (content: ChatFixtureStep): ThreadMessage =>
	({
		id: "assistant-1",
		createdAt: new Date(),
		role: "assistant",
		content,
		status: { type: "complete", reason: "stop" },
		metadata: { custom: {} },
	}) as unknown as ThreadMessage;

/** A fixture's final step: the reply as the thread holds it once done. */
const finalReply = (fixture: readonly ChatFixtureStep[]) =>
	assistantMessage(fixture[fixture.length - 1]);

/** What lands on the clipboard, read back the way Data/Eval would. */
const exportAsJson = (messages: ThreadMessage[]) =>
	JSON.parse(
		JSON.stringify(
			exportThread(messages, "thread-1", new Date("2026-10-04T12:00:00Z")),
		),
	);

describe("exportThread", () => {
	it("exports a Phase 1 thread as text-only parts", () => {
		const exported = exportAsJson([
			userMessage("hello there"),
			finalReply(phase1TextFixture),
		]);

		expect(exported).toEqual({
			exportedAt: "2026-10-04T12:00:00.000Z",
			threadId: "thread-1",
			messages: [
				{ role: "user", content: [{ type: "text", text: "hello there" }] },
				{
					role: "assistant",
					content: [
						{ type: "text", text: expect.stringContaining("stubbed backend") },
					],
				},
			],
		});
	});

	it("keeps a resolved analyze_pun call's args and result verbatim, between the reply's text", () => {
		const exported = exportAsJson([
			userMessage("got a pun?"),
			finalReply(phase2ToolCallFixture),
		]);

		expect(exported.messages[1].content).toEqual([
			{ type: "text", text: "Let me take a look at that pun for you..." },
			{
				type: "tool-call",
				toolCallId: "stub-call-1",
				toolName: "analyze_pun",
				args: {
					text: "I used to be a baker, but I couldn't make enough dough.",
				},
				result: punResult,
			},
			{ type: "text", text: expect.stringContaining("Found one") },
		]);
	});

	it("keeps a call that never got its result, with no result field", () => {
		// The fixture's second step: the call is running, as a reply that
		// failed or was stopped mid-call leaves it.
		const exported = exportAsJson([
			userMessage("got a pun?"),
			assistantMessage(phase2ToolCallFixture[1]),
		]);

		const call = exported.messages[1].content[1];
		expect(call).toMatchObject({
			type: "tool-call",
			toolCallId: "stub-call-1",
		});
		expect(call).not.toHaveProperty("result");
	});

	it("leaves out reasoning, other tools' calls and system messages", () => {
		const exported = exportAsJson([
			{
				id: "system-1",
				createdAt: new Date(),
				role: "system",
				content: [{ type: "text", text: "Be punny." }],
				metadata: { custom: {} },
			} as unknown as ThreadMessage,
			assistantMessage([
				{ type: "reasoning", text: "Thinking..." },
				{
					type: "tool-call",
					toolCallId: "other-1",
					toolName: "web_search",
					args: {},
					argsText: "{}",
				},
				{ type: "text", text: "Done." },
			]),
		]);

		expect(exported.messages).toEqual([
			{ role: "assistant", content: [{ type: "text", text: "Done." }] },
		]);
	});
});
