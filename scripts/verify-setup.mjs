import { execFile, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();

const results = [];

async function check(name, fn) {
	try {
		await fn();
		results.push({ name, ok: true });
		console.log(`✓ ${name}`);
	} catch (error) {
		results.push({ name, ok: false });
		console.error(`✗ ${name}`);
		console.error(`  ${error.message.split("\n")[0]}`);
	}
}

function run(cmd, args, opts = {}) {
	return execFileAsync(cmd, args, { cwd: ROOT, ...opts });
}

async function waitForServer(url, { timeoutMs = 8000, intervalMs = 300 } = {}) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		try {
			const res = await fetch(url);
			return res;
		} catch {
			await sleep(intervalMs);
		}
	}
	throw new Error(`timed out waiting for ${url}`);
}

// Compares the Node running this script against the minimum major in the
// root package.json's engines field (">=24"), since pnpm doesn't enforce it.
// Read with readFile rather than a JSON import so an old Node gets this
// check's message instead of a syntax error.
async function checkNodeVersion() {
	const { engines } = JSON.parse(
		await readFile(`${ROOT}/package.json`, "utf8"),
	);
	const required = Number(engines.node.match(/\d+/)[0]);
	const actual = Number(process.versions.node.split(".")[0]);
	if (actual < required) {
		throw new Error(
			`Node ${process.versions.node} is older than engines.node "${engines.node}"`,
		);
	}
}

async function checkDevServer({ cwd, command, args, env, url }) {
	const child = spawn(command, args, {
		cwd,
		stdio: "ignore",
		env: { ...process.env, ...env },
	});
	try {
		const res = await waitForServer(url);
		if (res.status >= 500) {
			throw new Error(`${url} responded with ${res.status}`);
		}
	} finally {
		child.kill();
	}
}

async function main() {
	await check("git present", () => run("git", ["--version"]));
	await check("node satisfies package.json engines", checkNodeVersion);
	await check("pnpm present", () => run("pnpm", ["--version"]));
	await check("uv present", () => run("uv", ["--version"]));

	await check("pnpm run lint", () => run("pnpm", ["run", "lint"]));
	await check("pnpm run check:mermaid", () =>
		run("pnpm", ["run", "check:mermaid"]),
	);

	await check("inference: ruff check", () =>
		run("uv", ["run", "ruff", "check", "."], { cwd: `${ROOT}/inference` }),
	);
	await check("inference: ruff format --check", () =>
		run("uv", ["run", "ruff", "format", "--check", "."], {
			cwd: `${ROOT}/inference`,
		}),
	);
	await check("inference: pytest", () =>
		run("uv", ["run", "pytest"], { cwd: `${ROOT}/inference` }),
	);
	await check("eval: ruff check", () =>
		run("uv", ["run", "ruff", "check", "."], { cwd: `${ROOT}/eval` }),
	);
	await check("eval: ruff format --check", () =>
		run("uv", ["run", "ruff", "format", "--check", "."], {
			cwd: `${ROOT}/eval`,
		}),
	);

	await check("backend dev server responds on /health", () =>
		checkDevServer({
			cwd: `${ROOT}/backend`,
			command: "node",
			args: ["src/index.ts"],
			env: { PORT: "8091" },
			url: "http://localhost:8091/health",
		}),
	);

	await check("frontend dev server responds", () =>
		checkDevServer({
			cwd: `${ROOT}/frontend`,
			command: "pnpm",
			args: ["exec", "vite", "--port", "5174", "--strictPort"],
			url: "http://localhost:5174",
		}),
	);

	const failed = results.filter((r) => !r.ok);
	console.log(
		`\n${results.length - failed.length}/${results.length} checks passed.`,
	);
	if (failed.length > 0) {
		process.exitCode = 1;
	}
}

main();
