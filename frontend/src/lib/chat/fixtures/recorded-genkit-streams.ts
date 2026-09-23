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

/** HTTP 200 with a mid-stream `error:` event (Backend run with an invalid Gemini API key). */
export const recordedErrorStream =
	'error: {"error":{"details":{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","domain":"googleapis.com","metadata":{"service":"generativelanguage.googleapis.com"}},{"@type":"type.googleapis.com/google.rpc.LocalizedMessage","locale":"en-US","message":"API key not valid. Please pass a valid API key."}]}},"status":"INVALID_ARGUMENT","message":"Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?alt=sse: [400 Bad Request] API key not valid. Please pass a valid API key.\\nDetails:\\n{\\n  \\"@type\\": \\"type.googleapis.com/google.rpc.ErrorInfo\\",\\n  \\"reason\\": \\"API_KEY_INVALID\\",\\n  \\"domain\\": \\"googleapis.com\\",\\n  \\"metadata\\": {\\n    \\"service\\": \\"generativelanguage.googleapis.com\\"\\n  }\\n}\\n{\\n  \\"@type\\": \\"type.googleapis.com/google.rpc.LocalizedMessage\\",\\n  \\"locale\\": \\"en-US\\",\\n  \\"message\\": \\"API key not valid. Please pass a valid API key.\\"\\n}"}}\n\n';
