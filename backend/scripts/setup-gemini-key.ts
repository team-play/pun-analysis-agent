/**
 * Binds a Gemini API key from a contributor's own AI Studio project to the
 * local Backend (TASK-74; docs/local-setup.md's Secrets section):
 *
 *   pnpm --filter backend run setup:gemini
 *
 * The key is read from a hidden prompt (or a pipe, e.g. from a password
 * manager's CLI), never from argv, so it stays out of shell history and of
 * any agent's transcript. It's checked with Google before anything is
 * written, then saved to backend/.env.local next to whatever is already there.
 */
import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { GEMINI_MODEL_LADDER } from "../src/config.ts";

const ENV_LOCAL = new URL("../.env.local", import.meta.url);
const ENV_EXAMPLE = new URL("../.env.example", import.meta.url);

/**
 * The model a fresh local setup is pinned to: the ladder's first Flash-Lite
 * model, so a 429 never steps a local run down to gemini-3.8-flash's 20
 * requests a day (AGENTS.md's "Gemini quota").
 */
export const LOCAL_GEMINI_MODEL = (() => {
	const model = GEMINI_MODEL_LADDER.find((name) =>
		name.endsWith("-flash-lite"),
	);
	if (!model) throw new Error("GEMINI_MODEL_LADDER has no Flash-Lite model.");
	return model;
})();

/** A line assigning `name`, e.g. `GEMINI_MODEL=x` or `export GEMINI_MODEL=x`. */
const assigns = (name: string) =>
	new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`);

/**
 * Returns `envFile` with GEMINI_API_KEY set to `apiKey`, and GEMINI_MODEL
 * pinned to LOCAL_GEMINI_MODEL unless the file already sets one. Every
 * other line is kept as it was. Also returns the model the file ends up
 * with, so the key can be checked against it.
 *
 * Current values are read with Node's own parser (util.parseEnv, the one
 * behind the `dev` script's --env-file), so quotes, comments and repeated
 * assignments mean here exactly what they mean to Backend.
 */
export const bindGeminiKey = (envFile: string, apiKey: string) => {
	const eol = envFile.includes("\r\n") ? "\r\n" : "\n";
	const lines = envFile === "" ? [] : envFile.split(/\r?\n/);
	if (lines.at(-1) === "") lines.pop();

	// Empty (as .env.example's bare `GEMINI_MODEL=` would leave it) means
	// unset, as in config.ts.
	const existingModel = parseEnv(envFile).GEMINI_MODEL || undefined;
	const model = existingModel ?? LOCAL_GEMINI_MODEL;

	const keyLine = `GEMINI_API_KEY=${apiKey}`;
	const updated = lines
		.map((line) => (assigns("GEMINI_API_KEY").test(line) ? keyLine : line))
		// Without a model set, every GEMINI_MODEL line is empty; drop them so
		// none can come after (and override) the pin added below.
		.filter((line) => existingModel || !assigns("GEMINI_MODEL").test(line));
	if (!updated.includes(keyLine)) updated.push(keyLine);
	if (!existingModel) updated.push(`GEMINI_MODEL=${model}`);

	return { contents: `${updated.join(eol)}${eol}`, model };
};

type GoogleError = {
	error?: { message?: string; details?: { reason?: string }[] };
};

/**
 * Throws a user-facing error unless `apiKey` can use `model`. Asks for the
 * model's metadata (models.get) rather than generating anything, which
 * doesn't count against the project's Gemini quota: TASK-74 sent 31 of
 * these in 33 s (twice Flash-Lite's 15/min) with no 429, and AI Studio's
 * usage page showed the calls but 0 Flash-Lite requests. The key goes in a
 * header, not the URL, so it can't end up in request logs.
 */
export const checkGeminiKey = async (
	apiKey: string,
	model: string,
	fetchFn: typeof fetch = fetch,
) => {
	const response = await fetchFn(
		`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`,
		{ headers: { "x-goog-api-key": apiKey } },
	).catch((error: unknown) => {
		throw new Error(
			"Couldn't reach the Gemini API to check the key. Check your connection and try again.",
			{ cause: error },
		);
	});
	if (response.ok) return;

	const body = (await response.json().catch(() => ({}))) as GoogleError;
	const googleMessage = body.error?.message;
	const detail = googleMessage ? ` Google said: "${googleMessage}"` : "";
	// A malformed standard key gets 400 API_KEY_INVALID; a malformed
	// authorization key gets 401. Other 400s (e.g. an unsupported location)
	// aren't about the key, so they fall through to the generic message.
	const invalidKey =
		response.status === 401 ||
		body.error?.details?.some(({ reason }) => reason === "API_KEY_INVALID");
	if (invalidKey) {
		throw new Error(
			`That key isn't valid. Copy it again from AI Studio's API Keys page.${detail}`,
		);
	}
	if (response.status === 403) {
		throw new Error(
			`The key is valid but isn't allowed to use the Gemini API. Check its restrictions in AI Studio.${detail}`,
		);
	}
	if (response.status === 404) {
		throw new Error(
			`The key works, but model ${model} isn't available to it. Set another GEMINI_MODEL in backend/.env.local.${detail}`,
		);
	}
	throw new Error(
		`The Gemini API answered ${response.status} when checking the key.${detail}`,
	);
};

/** Characters that would break, or add lines to, a dotenv assignment. */
const UNSAFE_IN_ENV_VALUE = /[\s"'`#\\]/;

type HiddenInput = NodeJS.ReadableStream & {
	isTTY?: boolean;
	setRawMode?: (mode: boolean) => unknown;
};

/**
 * Reads one line from `input` without echoing it. From a terminal it
 * switches to raw mode, so typed and pasted characters never reach the
 * screen, and Ctrl-C or Ctrl-D cancels. From a pipe it reads the first line.
 */
export const readHidden = (
	prompt: string,
	input: HiddenInput = process.stdin,
	output: NodeJS.WritableStream & { isTTY?: boolean } = process.stderr,
) => {
	if (!input.isTTY || !input.setRawMode) {
		// Someone at a terminal Node can't put in raw mode (e.g. Git Bash
		// without winpty) still needs the prompt; their typing will show.
		if (output.isTTY) output.write(prompt);
		return new Promise<string>((resolve, reject) => {
			let text = "";
			input.setEncoding("utf8");
			input.on("data", (chunk: string) => {
				text += chunk;
			});
			input.on("end", () => resolve(text.split(/\r?\n/)[0]));
			input.on("error", reject);
		});
	}

	output.write(prompt);
	const setRawMode = input.setRawMode.bind(input);
	return new Promise<string>((resolve, reject) => {
		let text = "";
		const finish = (settle: () => void) => {
			input.off("data", onData);
			input.off("end", onEnd);
			setRawMode(false);
			input.pause();
			output.write("\n");
			settle();
		};
		const cancel = () => finish(() => reject(new Error("Cancelled.")));
		const onEnd = cancel;
		const onData = (chunk: string) => {
			for (const char of chunk) {
				if (char === "\r" || char === "\n") return finish(() => resolve(text));
				if (char === "\u0003" || char === "\u0004") return cancel(); // Ctrl-C, Ctrl-D
				if (char === "\u007f" || char === "\b") text = text.slice(0, -1);
				else if (char >= " ") text += char; // drop other control characters
			}
		};
		setRawMode(true);
		input.setEncoding("utf8");
		input.on("data", onData);
		input.on("end", onEnd);
		input.resume();
	});
};

/** Reads `envLocal`, or `envExample` if there's no `envLocal` yet. */
const readEnvFile = async (envLocal: URL, envExample: URL) => {
	try {
		return await readFile(envLocal, "utf8");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		// No .env.local yet: start from the example, so its comments come along.
		return readFile(envExample, "utf8");
	}
};

/**
 * Replaces `file` with `contents` in one step, owner-only from the start, so
 * neither a crash nor another user ever sees a half-written or readable key.
 * (Windows ignores the mode.)
 */
const writeSecretFile = async (file: URL, contents: string) => {
	const temp = new URL(`${file.href}.${randomUUID()}.tmp`);
	try {
		await writeFile(temp, contents, { mode: 0o600 });
		await rename(temp, file);
	} finally {
		await rm(temp, { force: true });
	}
};

/**
 * Checks `apiKey` with Google, then writes it to `envLocal`. An invalid key
 * leaves the file untouched. Returns the model local runs will use.
 */
export const saveGeminiKey = async (
	apiKey: string,
	{
		envLocal = ENV_LOCAL,
		envExample = ENV_EXAMPLE,
		fetchFn = fetch,
		log = console.error,
	}: {
		envLocal?: URL;
		envExample?: URL;
		fetchFn?: typeof fetch;
		log?: (message: string) => void;
	} = {},
) => {
	if (!apiKey) throw new Error("No key entered; nothing changed.");
	if (UNSAFE_IN_ENV_VALUE.test(apiKey)) {
		throw new Error(
			"That doesn't look like an API key (it has spaces, quotes or similar). Nothing changed.",
		);
	}

	const { contents, model } = bindGeminiKey(
		await readEnvFile(envLocal, envExample),
		apiKey,
	);
	log(`Checking the key against ${model}...`);
	await checkGeminiKey(apiKey, model, fetchFn);
	await writeSecretFile(envLocal, contents);
	return model;
};

/**
 * Warnings for settings exported in the shell: Node's --env-file never
 * overrides a variable that's already set, so these would beat the file.
 */
export const shellOverrideWarnings = (env: NodeJS.ProcessEnv) =>
	["GEMINI_API_KEY", "GEMINI_MODEL"]
		.filter((name) => env[name])
		.map(
			(name) =>
				`Warning: ${name} is set in your shell, so the Backend will use it instead of backend/.env.local. Remove it from your shell profile (e.g. ~/.zshrc) and open a new terminal.`,
		);

const main = async () => {
	const apiKey = await readHidden(
		"Paste your Gemini API key (it won't be shown): ",
	);
	const model = await saveGeminiKey(apiKey.trim());
	console.error(
		`Saved GEMINI_API_KEY to backend/.env.local; local runs use ${model}.`,
	);
	for (const warning of shellOverrideWarnings(process.env)) {
		console.error(warning);
	}
};

// Run only when executed, not when the tests import this file.
// (import.meta.main would do, but needs Node 24.2; engines allows any 24.)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}
