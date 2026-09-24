import type { ThreadMessage } from "@assistant-ui/react";

/**
 * A message's text parts joined into one string (non-text parts dropped).
 * Mirrors assistant-ui's own `getThreadMessageText`, which is only exported
 * from its `internal` entry point, so isn't a public API to depend on.
 */
export const getMessageText = (message: ThreadMessage): string =>
	message.content
		.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join("\n\n");
