import type { ThreadMessage } from "@assistant-ui/react";
import {
	ANALYZE_PUN_TOOL_NAME,
	type AnalyzePunArgs,
	type AnalyzeResult,
} from "./analyze-result";

/** A message part in an exported thread. */
export type ExportedPart =
	| { type: "text"; text: string }
	| {
			type: "tool-call";
			toolCallId: string;
			toolName: typeof ANALYZE_PUN_TOOL_NAME;
			args: AnalyzePunArgs;
			/** Missing when the reply failed or was stopped before the result. */
			result?: AnalyzeResult;
	  };

export type ExportedMessage = {
	role: "user" | "assistant";
	content: ExportedPart[];
};

/** A thread as copied to the clipboard for Data/Eval (TASK-15). */
export type ExportedThread = {
	exportedAt: string;
	threadId: string;
	messages: ExportedMessage[];
};

type MessagePart = ThreadMessage["content"][number];

const toExportedParts = (part: MessagePart): ExportedPart[] => {
	if (part.type === "text") return [{ type: "text", text: part.text }];
	if (part.type === "tool-call" && part.toolName === ANALYZE_PUN_TOOL_NAME) {
		return [
			{
				type: "tool-call",
				toolCallId: part.toolCallId,
				toolName: ANALYZE_PUN_TOOL_NAME,
				args: part.args as AnalyzePunArgs,
				// Set from Backend's toolResponse, which carries an /analyze result.
				result: part.result as AnalyzeResult | undefined,
			},
		];
	}
	return [];
};

/**
 * The thread's messages as Data/Eval reads them: text and analyze_pun calls
 * in order, with each call's result exactly as Inference returned it. Other
 * parts (e.g. reasoning) and system messages are left out. A call that
 * never got its result is kept without one, so a failed reply still shows
 * that the tool was called.
 */
export const exportThread = (
	messages: readonly ThreadMessage[],
	threadId: string,
	exportedAt: Date,
): ExportedThread => ({
	exportedAt: exportedAt.toISOString(),
	threadId,
	messages: messages.flatMap((message) => {
		if (message.role === "system") return [];
		// Widened so one flatMap covers both user and assistant part types.
		const parts: readonly MessagePart[] = message.content;
		return [{ role: message.role, content: parts.flatMap(toExportedParts) }];
	}),
});
