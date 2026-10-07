import assert from "node:assert/strict";
import {
	mkdtemp,
	readdir,
	readFile,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { after, describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import {
	bindGeminiKey,
	checkGeminiKey,
	LOCAL_GEMINI_MODEL,
	readHidden,
	saveGeminiKey,
	shellOverrideWarnings,
} from "../../scripts/setup-gemini-key.ts";
import { GEMINI_MODEL_LADDER } from "../../src/config.ts";

describe("LOCAL_GEMINI_MODEL", () => {
	test("is the ladder's first Flash-Lite model", () => {
		assert.equal(
			LOCAL_GEMINI_MODEL,
			GEMINI_MODEL_LADDER.find((name) => name.includes("flash-lite")),
		);
	});
});

describe("bindGeminiKey", () => {
	test("fills in .env.example's empty key and pins Flash-Lite, keeping every other line", () => {
		const example = [
			"# Gemini API key",
			"GEMINI_API_KEY=",
			"",
			"# GEMINI_MODEL=",
			"# APP_CHECK=off",
			"",
		].join("\n");

		const { contents, model } = bindGeminiKey(example, "new-key");

		assert.equal(
			contents,
			[
				"# Gemini API key",
				"GEMINI_API_KEY=new-key",
				"",
				"# GEMINI_MODEL=",
				"# APP_CHECK=off",
				`GEMINI_MODEL=${LOCAL_GEMINI_MODEL}`,
				"",
			].join("\n"),
		);
		assert.equal(model, LOCAL_GEMINI_MODEL);
	});

	test("replaces an existing key, including an exported one, and keeps the other settings", () => {
		const { contents } = bindGeminiKey(
			"APP_CHECK=off\nexport GEMINI_API_KEY=old-key\nINFERENCE_URL=http://localhost:9000",
			"new-key",
		);

		assert.equal(
			contents,
			`APP_CHECK=off\nGEMINI_API_KEY=new-key\nINFERENCE_URL=http://localhost:9000\nGEMINI_MODEL=${LOCAL_GEMINI_MODEL}\n`,
		);
	});

	test("keeps a model that's already set, and checks the key against it", () => {
		const { contents, model } = bindGeminiKey(
			"GEMINI_MODEL=gemini-3.1-flash-lite\n",
			"new-key",
		);

		assert.equal(model, "gemini-3.1-flash-lite");
		assert.equal(contents.match(/^GEMINI_MODEL=/gm)?.length, 1);
	});

	// The cases below follow Node's --env-file parser, which Backend's `dev`
	// script uses, rather than a line-by-line reading.
	test("reads a quoted model with a comment as Node does", () => {
		const { model } = bindGeminiKey(
			'GEMINI_MODEL="gemini-3.1-flash-lite" # mine\n',
			"new-key",
		);
		assert.equal(model, "gemini-3.1-flash-lite");
	});

	test("takes the last of repeated GEMINI_MODEL lines, as Node does", () => {
		const { model } = bindGeminiKey(
			"GEMINI_MODEL=gemini-3.8-flash\nGEMINI_MODEL=gemini-3.1-flash-lite\n",
			"new-key",
		);
		assert.equal(model, "gemini-3.1-flash-lite");
	});

	test("pins Flash-Lite when a later empty GEMINI_MODEL= unsets an earlier one, leaving no line to override it", () => {
		const { contents, model } = bindGeminiKey(
			"GEMINI_MODEL=gemini-3.8-flash\nGEMINI_MODEL=\n",
			"new-key",
		);

		assert.equal(model, LOCAL_GEMINI_MODEL);
		assert.deepEqual(contents.match(/^GEMINI_MODEL=.*$/gm), [
			`GEMINI_MODEL=${LOCAL_GEMINI_MODEL}`,
		]);
	});

	test("edits a CRLF file in place, keeping its line endings", () => {
		const { contents } = bindGeminiKey(
			"GEMINI_API_KEY=old\r\nAPP_CHECK=off\r\n",
			"new-key",
		);

		assert.equal(
			contents,
			`GEMINI_API_KEY=new-key\r\nAPP_CHECK=off\r\nGEMINI_MODEL=${LOCAL_GEMINI_MODEL}\r\n`,
		);
	});

	test("ignores commented-out settings", () => {
		const { contents, model } = bindGeminiKey(
			"# GEMINI_API_KEY=commented\n# GEMINI_MODEL=gemini-3.8-flash\n",
			"new-key",
		);

		assert.equal(model, LOCAL_GEMINI_MODEL);
		assert.match(contents, /^# GEMINI_API_KEY=commented$/m);
		assert.match(contents, /^GEMINI_API_KEY=new-key$/m);
	});

	test("writes a key into an empty file", () => {
		assert.equal(
			bindGeminiKey("", "new-key").contents,
			`GEMINI_API_KEY=new-key\nGEMINI_MODEL=${LOCAL_GEMINI_MODEL}\n`,
		);
	});
});

describe("checkGeminiKey", () => {
	const respondWith = (status: number, body: unknown = {}) => {
		const calls: [string, RequestInit | undefined][] = [];
		const fetchFn = (async (url: string, init?: RequestInit) => {
			calls.push([url, init]);
			return new Response(JSON.stringify(body), { status });
		}) as typeof fetch;
		return { fetchFn, calls };
	};

	test("asks for the model's metadata, not a generation, with the key in a header", async () => {
		const { fetchFn, calls } = respondWith(200);

		await checkGeminiKey("the-key", "gemini-3.5-flash-lite", fetchFn);

		const [url, init] = calls[0];
		assert.equal(
			url,
			"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite",
		);
		assert.equal(init?.method ?? "GET", "GET");
		assert.equal(new Headers(init?.headers).get("x-goog-api-key"), "the-key");
		assert.doesNotMatch(url, /the-key/);
	});

	// Trimmed from what Google returned for a malformed key of each kind.
	const invalidKeyResponses = [
		[
			"standard",
			400,
			{
				error: {
					message: "API key not valid. Please pass a valid API key.",
					details: [{ reason: "API_KEY_INVALID" }],
				},
			},
		],
		[
			"authorization",
			401,
			{
				error: {
					message: "Request had invalid authentication credentials.",
					details: [{ reason: "ACCESS_TOKEN_TYPE_UNSUPPORTED" }],
				},
			},
		],
	] as const;
	for (const [kind, status, body] of invalidKeyResponses) {
		test(`rejects an invalid ${kind} key with a clear message`, async () => {
			const { fetchFn } = respondWith(status, body);

			await assert.rejects(
				checkGeminiKey("bad-key", "gemini-3.5-flash-lite", fetchFn),
				(error: Error) =>
					error.message.startsWith("That key isn't valid.") &&
					error.message.includes(body.error.message),
			);
		});
	}

	test("doesn't blame the key for a 400 about something else", async () => {
		const { fetchFn } = respondWith(400, {
			error: {
				message: "User location is not supported for the API use.",
				details: [{ reason: "FAILED_PRECONDITION" }],
			},
		});
		await assert.rejects(
			checkGeminiKey("key", "gemini-3.5-flash-lite", fetchFn),
			(error: Error) =>
				error.message.startsWith("The Gemini API answered 400") &&
				error.message.includes("location is not supported"),
		);
	});

	test("tells a restricted key apart from an invalid one", async () => {
		const { fetchFn } = respondWith(403);
		await assert.rejects(
			checkGeminiKey("key", "gemini-3.5-flash-lite", fetchFn),
			/isn't allowed to use the Gemini API/,
		);
	});

	test("names the model when the key can't use it", async () => {
		const { fetchFn } = respondWith(404);
		await assert.rejects(
			checkGeminiKey("key", "gemini-9-nonexistent", fetchFn),
			/model gemini-9-nonexistent isn't available/,
		);
	});

	for (const status of [429, 500, 503]) {
		test(`fails on a ${status} rather than accepting the key unchecked`, async () => {
			const { fetchFn } = respondWith(status);
			await assert.rejects(
				checkGeminiKey("key", "gemini-3.5-flash-lite", fetchFn),
				new RegExp(`answered ${status}`),
			);
		});
	}

	test("reports an unreachable API without claiming the key is bad", async () => {
		const fetchFn = (async () => {
			throw new TypeError("fetch failed");
		}) as typeof fetch;
		await assert.rejects(
			checkGeminiKey("key", "gemini-3.5-flash-lite", fetchFn),
			/Couldn't reach the Gemini API/,
		);
	});
});

describe("readHidden", () => {
	const fakeTerminal = () => {
		const input = Object.assign(new PassThrough(), {
			isTTY: true,
			rawModes: [] as boolean[],
			paused: false,
			setRawMode(mode: boolean) {
				this.rawModes.push(mode);
			},
		});
		const pause = input.pause.bind(input);
		input.pause = () => {
			input.paused = true;
			return pause();
		};
		const output = new PassThrough();
		let written = "";
		output.on("data", (chunk) => {
			written += chunk;
		});
		return { input, output, written: () => written };
	};

	test("from a terminal, reads a line in raw mode without echoing it", async () => {
		const { input, output, written } = fakeTerminal();

		const line = readHidden("Key: ", input, output);
		input.write("secret-ke");
		input.write("yy\u007f\r");

		assert.equal(await line, "secret-key");
		assert.deepEqual(input.rawModes, [true, false]);
		// Paused again, so the process can exit once the script is done.
		assert.equal(input.paused, true);
		assert.equal(written(), "Key: \n");
	});

	test("accepts \\n as Enter and \\b as backspace, and drops other control characters", async () => {
		const { input, output } = fakeTerminal();

		const line = readHidden("Key: ", input, output);
		input.write("ab\u0007c\bd\n");

		assert.equal(await line, "abd");
	});

	for (const [name, char] of [
		["Ctrl-C", "\u0003"],
		["Ctrl-D", "\u0004"],
	]) {
		test(`${name} cancels and leaves raw mode`, async () => {
			const { input, output } = fakeTerminal();

			const line = readHidden("Key: ", input, output);
			input.write(`sec${char}`);

			await assert.rejects(line, /Cancelled/);
			assert.deepEqual(input.rawModes, [true, false]);
		});
	}

	test("cancels if the terminal's input ends before Enter", async () => {
		const { input, output } = fakeTerminal();

		const line = readHidden("Key: ", input, output);
		input.end("sec");

		await assert.rejects(line, /Cancelled/);
	});

	test("from a pipe, reads only the first line", async () => {
		const input = new PassThrough();
		const line = readHidden("Key: ", input, new PassThrough());
		input.end("piped-key\r\nsomething else\n");

		assert.equal(await line, "piped-key");
	});
});

describe("saveGeminiKey", () => {
	const okFetch = (async () => new Response("{}")) as typeof fetch;
	const invalidKeyFetch = (async () =>
		new Response(
			JSON.stringify({ error: { details: [{ reason: "API_KEY_INVALID" }] } }),
			{ status: 400 },
		)) as typeof fetch;

	const tempDirs: string[] = [];
	after(() => Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true }))));

	const tempFiles = async () => {
		const dir = await mkdtemp(path.join(tmpdir(), "setup-gemini-key-"));
		tempDirs.push(dir);
		const envExample = pathToFileURL(path.join(dir, ".env.example"));
		await writeFile(envExample, "# from the example\nGEMINI_API_KEY=\n");
		return {
			dir,
			envLocal: pathToFileURL(path.join(dir, ".env.local")),
			envExample,
			log: () => {},
		};
	};

	test("without a .env.local, starts from .env.example and writes it owner-only", async () => {
		const files = await tempFiles();

		const model = await saveGeminiKey("new-key", {
			...files,
			fetchFn: okFetch,
		});

		assert.equal(model, LOCAL_GEMINI_MODEL);
		assert.equal(
			await readFile(files.envLocal, "utf8"),
			`# from the example\nGEMINI_API_KEY=new-key\nGEMINI_MODEL=${LOCAL_GEMINI_MODEL}\n`,
		);
		if (process.platform !== "win32") {
			assert.equal((await stat(files.envLocal)).mode & 0o777, 0o600);
		}
		// No temp file left behind next to it.
		assert.deepEqual((await readdir(files.dir)).sort(), [
			".env.example",
			".env.local",
		]);
	});

	test("updates an existing .env.local, keeping its settings, and makes it owner-only", async () => {
		const files = await tempFiles();
		await writeFile(files.envLocal, "APP_CHECK=off\nGEMINI_API_KEY=old\n", {
			mode: 0o644,
		});

		await saveGeminiKey("new-key", { ...files, fetchFn: okFetch });

		const contents = await readFile(files.envLocal, "utf8");
		assert.match(contents, /^APP_CHECK=off$/m);
		assert.match(contents, /^GEMINI_API_KEY=new-key$/m);
		if (process.platform !== "win32") {
			assert.equal((await stat(files.envLocal)).mode & 0o777, 0o600);
		}
	});

	test("leaves .env.local untouched when Google rejects the key", async () => {
		const files = await tempFiles();
		await writeFile(files.envLocal, "GEMINI_API_KEY=old\n");

		await assert.rejects(
			saveGeminiKey("bad-key", { ...files, fetchFn: invalidKeyFetch }),
			/That key isn't valid/,
		);
		assert.equal(
			await readFile(files.envLocal, "utf8"),
			"GEMINI_API_KEY=old\n",
		);
	});

	for (const [label, key] of [
		["an empty key", ""],
		["a key with a space", "two words"],
		["a key that would add a line", "key\nAPP_CHECK=off"],
		["a quoted key", '"key"'],
		["a key with a comment marker", "key#rest"],
		["a key with a backslash", "key\\n"],
	]) {
		test(`refuses ${label} without calling Google or writing anything`, async () => {
			const files = await tempFiles();
			let called = false;
			const fetchFn = (async () => {
				called = true;
				return new Response("{}");
			}) as typeof fetch;

			await assert.rejects(saveGeminiKey(key, { ...files, fetchFn }));
			assert.equal(called, false);
			await assert.rejects(stat(files.envLocal), { code: "ENOENT" });
		});
	}
});

describe("shellOverrideWarnings", () => {
	test("warns about each Gemini setting exported in the shell, since it beats .env.local", () => {
		const warnings = shellOverrideWarnings({
			GEMINI_API_KEY: "from-zshrc",
			GEMINI_MODEL: "gemini-3.8-flash",
			PATH: "/usr/bin",
		});

		assert.equal(warnings.length, 2);
		assert.match(warnings[0], /^Warning: GEMINI_API_KEY is set in your shell/);
		assert.match(warnings[1], /^Warning: GEMINI_MODEL is set in your shell/);
		assert.ok(warnings.every((warning) => !warning.includes("from-zshrc")));
	});

	test("says nothing when neither is set, or set but empty", () => {
		assert.deepEqual(shellOverrideWarnings({ GEMINI_API_KEY: "" }), []);
	});
});
