import { describe, expect, it, vi } from "vitest";
import { byteStreamOf, utf8 } from "./fixtures/byte-stream";
import {
	recordedErrorStream,
	recordedPhase1Stream,
} from "./fixtures/recorded-genkit-streams";
import {
	type GenkitFlowEvent,
	parseGenkitFlowStream,
} from "./genkit-flow-stream";

const collect = async (
	body: ReadableStream<Uint8Array>,
): Promise<GenkitFlowEvent[]> => {
	const events: GenkitFlowEvent[] = [];
	for await (const event of parseGenkitFlowStream(body)) events.push(event);
	return events;
};

const RECORDED_MESSAGES = [
	'¿Qué le dijo una piñata a otra antes de la fiesta?: "¡No te rajes!" ',
	'\n\nIt\'s a pun because the Mexican idiom *"no te rajes"* means "don\'t chicken out,"',
	' but literally translates to "don\'t split open."',
];

const RECORDED_EVENTS: GenkitFlowEvent[] = [
	...RECORDED_MESSAGES.map((message) => ({ message })),
	{ result: RECORDED_MESSAGES.join("") },
];

describe("parseGenkitFlowStream", () => {
	it("parses a recorded Phase 1 stream into message events then a result", async () => {
		const bytes = utf8(recordedPhase1Stream);
		expect(await collect(byteStreamOf([bytes]))).toEqual(RECORDED_EVENTS);
	});

	it("parses identically wherever the network splits the body, including mid-character", async () => {
		const bytes = utf8(recordedPhase1Stream);
		// Every offset covers splits inside an event, inside the "\n\n"
		// delimiter, and inside multi-byte characters like "ñ".
		for (let offset = 1; offset < bytes.length; offset++) {
			const body = byteStreamOf([bytes.slice(0, offset), bytes.slice(offset)]);
			expect(await collect(body), `split at byte ${offset}`).toEqual(
				RECORDED_EVENTS,
			);
		}
	});

	it("parses a body delivered one byte per read", async () => {
		const bytes = utf8(recordedPhase1Stream);
		const oneBytePerRead = Array.from(bytes, (byte) => Uint8Array.of(byte));
		expect(await collect(byteStreamOf(oneBytePerRead))).toEqual(
			RECORDED_EVENTS,
		);
	});

	it("throws the Backend's error status and message on an error event", async () => {
		const body = byteStreamOf([utf8(recordedErrorStream)]);
		await expect(collect(body)).rejects.toThrow(
			/^INVALID_ARGUMENT: .*API key not valid/,
		);
	});

	it("throws if the body ends before a result event (reply was cut off)", async () => {
		const withoutResult = recordedPhase1Stream.slice(
			0,
			recordedPhase1Stream.indexOf('data: {"result"'),
		);
		await expect(collect(byteStreamOf([utf8(withoutResult)]))).rejects.toThrow(
			/ended before its final result/,
		);
	});

	it("throws if the body ends partway through an event", async () => {
		const bytes = utf8(recordedPhase1Stream);
		const cutMidEvent = bytes.slice(0, bytes.length - 10);
		await expect(collect(byteStreamOf([cutMidEvent]))).rejects.toThrow(
			/ended before its final result/,
		);
	});

	it("throws on an event it doesn't recognize rather than skipping it", async () => {
		const body = byteStreamOf([utf8('data: {"surprise":1}\n\n')]);
		await expect(collect(body)).rejects.toThrow(/Unrecognized/);
	});

	it("cancels the body when it stops early, so the download doesn't continue", async () => {
		const cancel = vi.fn();
		const stillStreaming = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(utf8('data: {"surprise":1}\n\n'));
				// Never closed: the server is still sending.
			},
			cancel,
		});
		await expect(collect(stillStreaming)).rejects.toThrow(/Unrecognized/);
		expect(cancel).toHaveBeenCalledOnce();
	});
});
