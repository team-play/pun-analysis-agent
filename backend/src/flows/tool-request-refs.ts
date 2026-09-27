import type {
	GenerateResponseData,
	MessageData,
	ModelMiddlewareWithOptions,
	Part,
} from "genkit/model";

/**
 * A model middleware that gives each tool call the model makes a `ref`,
 * so Frontend can tell which toolResponse answers which toolRequest
 * (docs/contracts.md). Gemini can call analyze_pun several times at once,
 * and Genkit then returns every result in one chunk, in the order the
 * calls *finished*. Gemini usually leaves `ref` empty, and a toolResponse
 * doesn't carry its input, so without this the results can't be matched
 * to the calls. Genkit copies a toolRequest's `ref` onto its toolResponse,
 * so numbering the requests is enough.
 *
 * Refs are "0", "1", ... in the order the model made the calls, across
 * every model turn of one reply (create one middleware per reply). The
 * streamed chunks and the final message get the same numbers because they
 * list the same calls in the same order. A call can also be streamed in
 * pieces (every piece but the last marked `partial`, then merged into one
 * call in the final message), so the pieces of one call share its ref. A
 * call that already has a ref keeps it and isn't counted.
 */
export function numberToolRequests(): ModelMiddlewareWithOptions {
	let nextRef = 0;

	return async (request, options, next) => {
		const firstRef = nextRef;
		const numberFrom = (start: number) => {
			let ref = start;
			// The ref of a call whose remaining pieces are still to come.
			let unfinishedCallRef: string | undefined;
			const numberPart = (part: Part): Part => {
				if (!part.toolRequest || part.toolRequest.ref) return part;
				const callRef = unfinishedCallRef ?? String(ref++);
				unfinishedCallRef = part.toolRequest.partial ? callRef : undefined;
				return { ...part, toolRequest: { ...part.toolRequest, ref: callRef } };
			};
			return { numberPart, count: () => ref - start };
		};

		const streamed = numberFrom(firstRef);
		const onChunk = options?.onChunk;
		const response = await next(
			request,
			onChunk && {
				...options,
				onChunk: (chunk) =>
					onChunk({
						...chunk,
						content: chunk.content.map(streamed.numberPart),
					}),
			},
		);

		const final = numberFrom(firstRef);
		const numbered = numberMessage(response, (message) => ({
			...message,
			content: message.content.map(final.numberPart),
		}));
		nextRef = firstRef + Math.max(streamed.count(), final.count());
		return numbered;
	};
}

/**
 * `response` with its message replaced by `update(message)`. Models return
 * the message either as `message` (mockModel) or, in the older form, as
 * the first of `candidates` (the Gemini plugin); Genkit reads `message`
 * first, then `candidates[0].message`.
 */
function numberMessage(
	response: GenerateResponseData,
	update: (message: MessageData) => MessageData,
): GenerateResponseData {
	if (response.message) {
		return { ...response, message: update(response.message) };
	}
	const [first, ...rest] = response.candidates ?? [];
	if (first) {
		return {
			...response,
			candidates: [{ ...first, message: update(first.message) }, ...rest],
		};
	}
	return response;
}
