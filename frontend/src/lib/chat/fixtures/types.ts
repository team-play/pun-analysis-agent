import type { ThreadAssistantMessagePart } from "@assistant-ui/react";

/**
 * One step of a canned stream: the full assistant message content as of
 * that point. Matches the real ChatModelAdapter contract, where each
 * yielded `content` replaces (not appends to) the previous one.
 */
export type ChatFixtureStep = readonly ThreadAssistantMessagePart[];

export type ChatFixture = readonly ChatFixtureStep[];
