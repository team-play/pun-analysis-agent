// Checks how Gemini answers when analyze_pun leaves the explanation to it:
// an llm_fallback result, or the undetermined one (TASK-20). See README.md
// next to this file for the cases, the grading scale and what it found.
//
// Run from the repo root, with one Flash-Lite model pinned in
// backend/.env.local (GEMINI_MODEL=gemini-3.5-flash-lite), per AGENTS.md's
// Gemini quota rules:
//   node --env-file=backend/.env.local docs/experiments/task-20/check.mjs
// Each reply goes through Backend's own chat flow and system instruction,
// in this process, with an Inference stand-in that answers each case's
// /analyze result. A reply that calls the tool costs two requests, so a run
// is about 10. The run is saved as runs/<start time>.json.
import { mkdir, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { config } from "../../../backend/src/config.ts";
import { createChatFlow } from "../../../backend/src/flows/chat.ts";
import { ai, chatModels } from "../../../backend/src/genkit.ts";
import {
	createAnalyzePunTool,
	UNDETERMINED_ANALYZE_RESULT,
} from "../../../backend/src/tools/analyze-pun.ts";

// Unpinned, a 429 steps down the ladder, and gemini-3.8-flash's 20
// requests/day are production's last resort (AGENTS.md).
if (!config.geminiModel?.includes("flash-lite")) {
	throw new Error(
		"Pin one Flash-Lite model: set GEMINI_MODEL in backend/.env.local.",
	);
}

const fallback = (pun_type, words_involved, confidence) => ({
	is_pun: true,
	pun_type,
	words_involved,
	explanation: "",
	confidence,
	sense_source: "llm_fallback",
});

// What Inference would answer for each text, without the probabilities it
// also sends (this paragraph doesn't use them). The wrong guess and the
// false positive are what main's Inference (70fbbe5) answers for those
// texts; homophonic puns always come back with no words, since sense
// selection skips them.
const CASES = [
	{
		name: "homographic, right guess",
		text: "Why did the scarecrow win an award? He was outstanding in his field.",
		result: fallback("homographic", ["outstanding"], 0.96),
	},
	{
		name: "homographic, wrong guess",
		text: "I used to be a banker but I lost interest.",
		result: fallback("homographic", ["banker"], 1.0),
	},
	{
		name: "homophonic, no words",
		text: "A bicycle can't stand on its own because it is two tired.",
		result: fallback("homophonic", [], 0.9),
	},
	{
		name: "undetermined",
		text: "Time flies like an arrow; fruit flies like a banana.",
		result: UNDETERMINED_ANALYZE_RESULT,
	},
	{
		name: "detector false positive",
		text: "We had a picnic on the river bank.",
		result: fallback("homographic", ["picnic"], 0.97),
	},
];
// Flash-Lite allows 15 requests/min; AGENTS.md says stay at or under 10.
// Two requests per case, so one case every 15 s is 8/min.
const PAUSE_BETWEEN_CASES_MS = 15_000;

let current;
let inferenceCalls = 0;
const analyzePun = createAnalyzePunTool(ai, {
	fetch: async () => {
		inferenceCalls++;
		return Response.json(current.result);
	},
	inferenceUrl: "http://localhost:8000", // Unused: the stand-in answers.
});
const chatFlow = createChatFlow(ai, chatModels, [analyzePun]);

const ranAt = new Date().toISOString();
const results = [];
for (const [i, testCase] of CASES.entries()) {
	if (i > 0) await sleep(PAUSE_BETWEEN_CASES_MS);
	current = testCase;
	inferenceCalls = 0;
	try {
		const reply = await chatFlow({
			messages: [{ role: "user", content: `Is this a pun? ${testCase.text}` }],
		});
		results.push({ ...testCase, toolCalls: inferenceCalls, reply });
		console.log(`${testCase.name}: ${inferenceCalls} tool call(s)\n${reply}\n`);
	} catch (err) {
		const failure = err.status ?? String(err);
		results.push({ ...testCase, toolCalls: inferenceCalls, failure });
		console.log(`${testCase.name}: failed (${failure})`);
		// AGENTS.md: stop at the first 429, don't push through.
		if (failure === "RESOURCE_EXHAUSTED") break;
	}
}

const runsDir = new URL("runs/", import.meta.url);
await mkdir(runsDir, { recursive: true });
await writeFile(
	new URL(`${ranAt.replaceAll(":", "-")}.json`, runsDir),
	`${JSON.stringify({ ranAt, model: config.geminiModel, results }, null, "\t")}\n`,
);
