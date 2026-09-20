import type { ChatFixture } from "./types";

const FULL_TEXT =
	"I'm running on a stubbed backend right now, so no Gemini quota was " +
	"harmed in the making of this reply. Ask me about a pun (try the word " +
	'"pun") and I\'ll show you what the tool-call fixture looks like.';

const growingText = (text: string, steps: number): string[] => {
	const chunkSize = Math.ceil(text.length / steps);
	return Array.from({ length: steps }, (_, i) =>
		text.slice(0, (i + 1) * chunkSize),
	);
};

/** Phase 1 shape: a plain-text-only stream, no tool calls. */
export const phase1TextFixture: ChatFixture = growingText(FULL_TEXT, 8).map(
	(text) => [{ type: "text", text }],
);
