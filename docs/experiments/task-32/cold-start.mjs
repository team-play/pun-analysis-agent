// Measures Inference's cold start on Cloud Run, to set INFERENCE_TIMEOUT_MS
// from. See README.md next to this file for what it found.
//
// Run from the repo root, signed in to gcloud as an identity that may
// invoke the service (a project admin, or roles/run.invoker on it):
//   node docs/experiments/task-32/cold-start.mjs a,b,a,c,a
// Each letter is one sample of a scenario (SCENARIOS below). Before each
// one the script waits IDLE_WAIT_MS without calling Inference, so Cloud Run
// scales it to zero on its own, as it does between real users. A sample
// only counts as a cold start if Cloud Run's logs show an instance starting
// up while it ran: production traffic can wake Inference during the wait,
// and Cloud Run may keep an idle instance longer than usual.
// The samples are appended to runs/cold-start-<start time>.json as they're
// taken, so a run cut short keeps what it measured.
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);

const PROJECT = "pun-agent";
const REGION = "us-east1";
const SERVICE = "pun-agent-inference";
// The deploy's own smoke-test sentence (inference/Dockerfile).
const TEXT = "The baker needed more dough.";
// /analyze's longest input (MAX_CHARS) made of words with many WordNet
// senses, which fill the extractor's candidate and sense limits: the
// slowest kind of text found in docs/experiments/task-55. The detector
// caches senses and embeddings per word, so the three texts share no
// words: a text whose words were seen before would measure the cache.
const MAX_CHARS = 2000;
const DENSE_WORDS = [
	"bank pitch seal bark bat bear bolt bow club court crane date deck draft",
	"fair fan file fire fly foot grave ground jam key lead letter light match",
	"mine mold nail note palm park plant play pound punch race ring rock rose",
].map((words) => words.split(" "));
const denseText = (words) => {
	let text = "";
	for (let i = 0; text.length < MAX_CHARS; i++) {
		text += `The ${words[i % words.length]} and the ${words[(i * 5 + 3) % words.length]}. `;
	}
	return text.slice(0, MAX_CHARS);
};
const DENSE_TEXTS = DENSE_WORDS.map(denseText);
// Cloud Run keeps an idle instance for up to about 15 minutes.
const IDLE_WAIT_MS = 20 * 60_000;
// Cloud Run's logs can take a minute or so to become readable.
const LOG_DELAY_MS = 90_000;
// Far above INFERENCE_TIMEOUT_MS, so a slow cold start is measured rather
// than cut off.
const REQUEST_TIMEOUT_MS = 120_000;
// TASK-53: Backend pings /health without waiting for it, then calls
// /analyze once Gemini's first turn asks for it (about 3-7 s later).
const HEALTH_LEAD_MS = 5_000;
const PARALLEL_CALLS = 3;

const gcloud = async (...args) =>
	(await run("gcloud", [...args, `--project=${PROJECT}`])).stdout.trim();

const serviceUrl = () =>
	gcloud(
		"run",
		"services",
		"describe",
		SERVICE,
		`--region=${REGION}`,
		"--format=value(status.url)",
	);

/**
 * One request, timed the way analyze_pun's timeout runs: from sending it
 * until the whole body has arrived. Failures are recorded, not thrown.
 */
const timed = async (url, init) => {
	const sentAt = Date.now();
	try {
		const response = await fetch(url, {
			...init,
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});
		const body = await response.text();
		return {
			sentAt: new Date(sentAt).toISOString(),
			ms: Date.now() - sentAt,
			status: response.status,
			...(response.ok ? {} : { body }),
		};
	} catch (err) {
		return {
			sentAt: new Date(sentAt).toISOString(),
			ms: Date.now() - sentAt,
			error: String(err),
		};
	}
};

const analyze = (url, token, text = TEXT) =>
	timed(new URL("/analyze", url), {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ text }),
	});

const SCENARIOS = {
	// One /analyze with nothing warming Inference first: what
	// INFERENCE_TIMEOUT_MS has to cover (TASK-53's ping doesn't always run).
	a: {
		name: "unassisted",
		take: async (url, token) => ({ analyze: [await analyze(url, token)] }),
	},
	// Parallel analyze_pun calls: they start their timeouts together, but
	// Inference (one instance, concurrency 1) answers them one at a time.
	b: {
		name: "parallel",
		take: async (url, token) => ({
			analyze: await Promise.all(
				Array.from({ length: PARALLEL_CALLS }, () => analyze(url, token)),
			),
		}),
	},
	// TASK-53's warm-up ping, then the /analyze it was meant to speed up.
	c: {
		name: "after-health-ping",
		take: async (url, token) => {
			const health = timed(new URL("/health", url), {
				headers: { Authorization: `Bearer ${token}` },
			});
			await sleep(HEALTH_LEAD_MS);
			const result = await analyze(url, token);
			return { health: await health, analyze: [result] };
		},
	},
	// The slowest texts, on a cold start: the waking request also waits for
	// its text's analysis, with every cache empty.
	d: {
		name: "unassisted-dense",
		take: async (url, token) => ({
			analyze: [await analyze(url, token, DENSE_TEXTS[0])],
		}),
	},
	e: {
		name: "parallel-dense",
		take: async (url, token) => ({
			analyze: await Promise.all(
				DENSE_TEXTS.map((text) => analyze(url, token, text)),
			),
		}),
	},
};

/**
 * Cloud Run's startup lines and request logs for the service between
 * `from` and `to`: whether an instance started for this sample, and
 * Cloud Run's own latency for each request.
 */
const logsBetween = async (from, to) => {
	const filter = [
		'resource.type="cloud_run_revision"',
		`resource.labels.service_name="${SERVICE}"`,
		`timestamp>="${from.toISOString()}"`,
		`timestamp<="${to.toISOString()}"`,
		'(textPayload:"Application startup complete" OR httpRequest.requestUrl:*)',
	].join(" AND ");
	const entries = JSON.parse(
		await gcloud("logging", "read", filter, "--format=json", "--order=asc"),
	);
	return {
		startups: entries
			.filter((e) => e.textPayload?.includes("Application startup complete"))
			.map((e) => ({
				at: e.timestamp,
				revision: e.resource.labels.revision_name,
				instanceId: e.labels?.instanceId,
			})),
		requests: entries
			.filter((e) => e.httpRequest)
			.map((e) => ({
				at: e.timestamp,
				path: new URL(e.httpRequest.requestUrl).pathname,
				status: e.httpRequest.status,
				latency: e.httpRequest.latency,
				instanceId: e.labels?.instanceId,
			})),
	};
};

const letters = (process.argv[2] ?? "").split(",").filter(Boolean);
const unknown = letters.filter((letter) => !(letter in SCENARIOS));
if (letters.length === 0 || unknown.length > 0) {
	console.error(
		`Usage: cold-start.mjs <scenarios, e.g. a,b,a,c>; known: ${Object.keys(SCENARIOS).join(", ")}`,
	);
	process.exit(2);
}

const url = await serviceUrl();
const startedAt = new Date().toISOString();
const outPath = new URL(
	`runs/cold-start-${startedAt.replaceAll(":", "-")}.json`,
	import.meta.url,
);
await mkdir(new URL("runs/", import.meta.url), { recursive: true });
const record = {
	startedAt,
	url,
	text: TEXT,
	denseTexts: DENSE_TEXTS,
	samples: [],
};

for (const [i, letter] of letters.entries()) {
	const { name, take } = SCENARIOS[letter];
	// Fetched before timing, not inside it: Backend's comes from the local
	// metadata server, and its client is created and the token cached by
	// the first warm-up ping, so analyze_pun's share is milliseconds.
	const token = await gcloud("auth", "print-identity-token");
	console.log(
		`${new Date().toISOString()} sample ${i + 1}/${letters.length} (${name}): waiting ${IDLE_WAIT_MS / 60_000} min idle`,
	);
	await sleep(IDLE_WAIT_MS);
	const windowStart = new Date();
	const sample = { scenario: name, ...(await take(url, token)) };
	const windowEnd = new Date();

	await sleep(LOG_DELAY_MS);
	// The startup line can be logged up to about a second after the waking
	// request is answered; the 5 s slack on each end covers that and clock
	// skew. A failed log read keeps the sample, unconfirmed, rather than
	// losing a 20-minute wait.
	try {
		sample.logs = await logsBetween(
			new Date(windowStart.getTime() - 5_000),
			new Date(windowEnd.getTime() + 5_000),
		);
		sample.coldStart = sample.logs.startups.length > 0;
	} catch (err) {
		sample.logsError = String(err);
		sample.coldStart = null;
	}
	record.samples.push(sample);
	await writeFile(outPath, `${JSON.stringify(record, null, "\t")}\n`);

	console.log(
		`  cold start: ${sample.coldStart}; /analyze: ${sample.analyze
			.map((r) => `${r.ms} ms ${r.status ?? r.error}`)
			.join(", ")}`,
	);
}
console.log(`Saved ${fileURLToPath(outPath)}`);
