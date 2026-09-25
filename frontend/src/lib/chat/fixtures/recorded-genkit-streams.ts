/**
 * Raw `/api/chat` response bodies recorded from the real Phase 1 Backend
 * (`curl -N` against `pnpm dev` in backend/, 2026-09-23), byte-for-byte.
 * The live adapter's parsing tests replay these instead of a live stream,
 * per docs/design/frontend-design.md's "Development & testing" section.
 */

/**
 * A successful reply from Gemini. Deliberately includes multi-byte UTF-8
 * characters (¿ é ñ ¡) so tests can split the bytes mid-character.
 */
export const recordedPhase1Stream =
	'data: {"message":"¿Qué le dijo una piñata a otra antes de la fiesta?: \\"¡No te rajes!\\" "}\n\n' +
	'data: {"message":"\\n\\nIt\'s a pun because the Mexican idiom *\\"no te rajes\\"* means \\"don\'t chicken out,\\""}\n\n' +
	'data: {"message":" but literally translates to \\"don\'t split open.\\""}\n\n' +
	'data: {"result":"¿Qué le dijo una piñata a otra antes de la fiesta?: \\"¡No te rajes!\\" \\n\\nIt\'s a pun because the Mexican idiom *\\"no te rajes\\"* means \\"don\'t chicken out,\\" but literally translates to \\"don\'t split open.\\""}\n\n';

/**
 * HTTP 200 with a mid-stream `error:` event: Backend run with an invalid
 * Gemini API key (re-recorded 2026-09-23 after TASK-23 made error messages
 * user-facing, per docs/contracts.md's "Failed replies").
 */
export const recordedErrorStream =
	'error: {"error":{"status":"INVALID_ARGUMENT","message":"Something went wrong. Please try again."}}\n\n';
