// Checks that the production Flash-Lite models follow the system
// instruction's detector-score paragraph (DETECTOR_SCORES_RULE): describe
// confidence and probabilities in words, never as numbers or certainty. See
// README.md next to this file for what it found.
//
// Run from the repo root:
//   node --env-file=backend/.env.local docs/experiments/task-56/check.mjs
// Each reply goes through Backend's own chat flow (createChatFlow), in this
// process, with each model as a one-model ladder (pinned, per AGENTS.md's
// Gemini quota rules) at its production config. analyze_pun answers with
// Inference's real results for these texts, recorded in
// analyze-results.json by record_results.py, so the run needs no Inference.
// The run is saved as runs/<start time>.json.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { setTimeout as sleep } from "node:timers/promises";
import { GEMINI_MODEL_CONFIG } from "../../../backend/src/config.ts";
import { createChatFlow } from "../../../backend/src/flows/chat.ts";
import { ai } from "../../../backend/src/genkit.ts";
import {
	createAnalyzePunTool,
	UNDETERMINED_ANALYZE_RESULT,
} from "../../../backend/src/tools/analyze-pun.ts";

// The plugin is only installed in backend/, so it's resolved from there (as
// in task-47's compare.mjs).
const { googleAI } = await import(
	createRequire(
		new URL("../../../backend/package.json", import.meta.url),
	).resolve("@genkit-ai/google-genai")
);

const RECORDED = JSON.parse(
	await readFile(new URL("analyze-results.json", import.meta.url), "utf8"),
);
const [CLEAR_PUN, CLEAR_NON_PUN, CLASS_SPLIT, TENTATIVE] =
	Object.keys(RECORDED);
const PROMPTS = {
	"clear pun": `Is this a pun? ${CLEAR_PUN}`,
	"clear non-pun": `Is this a pun? ${CLEAR_NON_PUN}`,
	"class split": `Is this a pun? ${CLASS_SPLIT}`,
	tentative: `Is this a pun? ${TENTATIVE}`,
	// The class split again, with the user asking for the number outright.
	"asks for a percentage": `Is this a pun, and how sure is the classifier, as a percentage? ${CLASS_SPLIT}`,
};
const MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
const RUNS_PER_CASE = 3;
// The loop alternates models, so each one waits at least two pauses (12 s)
// between its replies. A two-request reply (the tool call, then the answer)
// then stays at or under 10 requests/min per model; replies that make more
// (an example pun, a retry) rely on the replies' own latency to stay under.
const PAUSE_BETWEEN_REPLIES_MS = 6_000;

// Answers with the recorded result for the text Gemini sent. Gemini is told
// to send the text exactly as written; if it doesn't, the reply gets the
// undetermined result and the call is flagged, so the grading can drop it.
let toolCalls = [];
const recordedFetch = async (_url, { body }) => {
	const { text } = JSON.parse(body);
	const result = RECORDED[text.trim()];
	toolCalls.push({ text, matched: result !== undefined });
	return Response.json(result ?? UNDETERMINED_ANALYZE_RESULT);
};
const analyzePun = createAnalyzePunTool(ai, {
	fetch: recordedFetch,
	inferenceUrl: "http://localhost:8000", // Unused: recordedFetch answers.
});
const flows = Object.fromEntries(
	MODELS.map((model) => [
		model,
		createChatFlow(
			ai,
			[googleAI.model(model, GEMINI_MODEL_CONFIG[model] ?? {})],
			[analyzePun],
		),
	]),
);

const ranAt = new Date().toISOString();
const results = [];
let repliesSent = 0;
run: for (let run = 1; run <= RUNS_PER_CASE; run++) {
	for (const [caseName, prompt] of Object.entries(PROMPTS)) {
		for (const model of MODELS) {
			if (repliesSent++ > 0) await sleep(PAUSE_BETWEEN_REPLIES_MS);
			toolCalls = [];
			let reply = null;
			let failure = null;
			try {
				reply = await flows[model]({
					messages: [{ role: "user", content: prompt }],
				});
			} catch (err) {
				failure = err.status ?? String(err);
			}
			results.push({ model, case: caseName, run, failure, toolCalls, reply });
			console.log(`${model}, ${caseName}, run ${run}: ${failure ?? "ok"}`);
			// AGENTS.md: stop at the first 429, don't push through.
			if (failure === "RESOURCE_EXHAUSTED") break run;
		}
	}
}

const runsDir = new URL("runs/", import.meta.url);
await mkdir(runsDir, { recursive: true });
await writeFile(
	new URL(`${ranAt.replaceAll(":", "-")}.json`, runsDir),
	`${JSON.stringify({ ranAt, prompts: PROMPTS, results }, null, "\t")}\n`,
);
