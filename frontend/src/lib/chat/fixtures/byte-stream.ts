/**
 * Wraps pre-split byte chunks in a ReadableStream, so tests control exactly
 * where the network "breaks" a response body between reads.
 */
export const byteStreamOf = (
	chunks: readonly Uint8Array[],
): ReadableStream<Uint8Array> =>
	new ReadableStream({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(chunk);
			controller.close();
		},
	});

export const utf8 = (text: string): Uint8Array =>
	new TextEncoder().encode(text);
