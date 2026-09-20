import type { ThreadAssistantMessagePart } from "@assistant-ui/react";
import type { ChatFixture } from "./types";

const TOOL_CALL_ID = "stub-call-1";
const TOOL_NAME = "analyze_pun";

const ANALYZED_TEXT = "I used to be a baker, but I couldn't make enough dough.";

/** Shape from docs/contracts.md's `/analyze` response. */
const ANALYZE_RESULT = {
	is_pun: true,
	pun_type: "homographic" as const,
	words_involved: ["dough"],
	explanation:
		'"Dough" plays on its literal sense (bread dough) and its slang sense (money) — a baker "not making enough dough" reads as both a baking and a financial complaint.',
	confidence: 0.94,
	sense_source: "wordnet" as const,
};

const preamble: ThreadAssistantMessagePart = {
	type: "text",
	text: "Let me take a look at that pun for you...",
};

const runningToolCall: ThreadAssistantMessagePart = {
	type: "tool-call",
	toolCallId: TOOL_CALL_ID,
	toolName: TOOL_NAME,
	args: { text: ANALYZED_TEXT },
	argsText: JSON.stringify({ text: ANALYZED_TEXT }),
};

const completedToolCall: ThreadAssistantMessagePart = {
	...runningToolCall,
	result: ANALYZE_RESULT,
};

const followUp: ThreadAssistantMessagePart = {
	type: "text",
	text: 'Found one: it\'s a homographic pun on "dough", playing bread dough against money. Nice, right?',
};

/** Phase 2 shape: text, then a tool call that resolves, then more text. */
export const phase2ToolCallFixture: ChatFixture = [
	[preamble],
	[preamble, runningToolCall],
	[preamble, completedToolCall],
	[preamble, completedToolCall, followUp],
];
