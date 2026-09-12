import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;

const mermaid = (await import("mermaid")).default;

const ROOT = process.cwd();
const IGNORED_DIRS = new Set([
	"node_modules",
	".git",
	".venv",
	"dist",
	"build",
	".ruff_cache",
	".pytest_cache",
	"__pycache__",
]);

async function findMarkdownFiles(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		if (IGNORED_DIRS.has(entry.name)) continue;
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await findMarkdownFiles(path)));
		} else if (extname(entry.name) === ".md") {
			files.push(path);
		}
	}
	return files;
}

function extractMermaidBlocks(markdown) {
	const blocks = [];
	const regex = /```mermaid\n([\s\S]*?)```/g;
	let match = regex.exec(markdown);
	while (match !== null) {
		blocks.push(match[1]);
		match = regex.exec(markdown);
	}
	return blocks;
}

const files = await findMarkdownFiles(ROOT);
let checked = 0;
let failed = 0;

for (const file of files) {
	const content = await readFile(file, "utf8");
	const blocks = extractMermaidBlocks(content);
	for (const [index, block] of blocks.entries()) {
		checked += 1;
		try {
			await mermaid.parse(block);
		} catch (error) {
			failed += 1;
			console.error(`✗ ${relative(ROOT, file)} (mermaid block #${index + 1})`);
			console.error(`  ${error.message.split("\n")[0]}`);
		}
	}
}

if (checked === 0) {
	console.log("No mermaid blocks found.");
} else if (failed > 0) {
	console.error(`\n${failed}/${checked} mermaid block(s) failed to parse.`);
	process.exitCode = 1;
} else {
	console.log(`✓ ${checked} mermaid block(s) parsed cleanly.`);
}
