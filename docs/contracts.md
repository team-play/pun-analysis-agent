# API Contracts

The only two hard cross-domain dependencies in this project. Any change here must be agreed by both sides of the contract before landing.

## `/analyze` (Inference → Backend, Data/Eval)

```
POST /analyze
{ "text": string }
→ {
    "is_pun": bool,
    "pun_type": "homographic" | "homophonic" | null,
    "words_involved": [string],
    "explanation": string,
    "confidence": float,
    "sense_source": "wordnet" | "wiktionary" | "llm_fallback" | null
  }
```

`sense_source` reports which tier of the sense-selection fallback chain produced `explanation` — `null` when `is_pun` is `false` (no sense selection needed) or when every tier failed (the graceful-failure case). See [`design/sense-selection.md`](design/sense-selection.md) for the full tiered design this field tracks.

## `/api/chat` (Backend → Frontend)

```
POST /api/chat
{ "messages": [{ "role": string, "content": string }] }
→ streamed response (Genkit flow stream format)
```

The body is Genkit's flow-stream format served as `text/plain`, **not** Server-Sent Events: `error:` isn't an SSE field, so `EventSource` or an SSE library would silently drop failures. Parse it by splitting on the blank line (`\n\n`) that ends each event and switching on its `data: ` / `error: ` prefix. JSON payloads are single-line, since `JSON.stringify` escapes any newline inside them:

```
data: {"message": string}\n\n                      zero or more (Phase 1; see Phase 2 below) — each is the next piece of the reply, not the reply so far
data: {"result": string}\n\n                       exactly one, last — the complete reply
error: {"error": {"status": string, "message": string}}\n\n   instead of `result`, if the reply fails
```

A body that ends without either a `result` or an `error:` event was cut off, and Frontend treats it as a failure. An event missing its closing `\n\n` counts as not received, as in SSE.

The text-only stream shape above covers Phase 1 (plain Gemini proxy, no tool calls — see [`engineering-practices.md`](engineering-practices.md)). Phase 2 (once the `analyze_pun` tool exists) adds `toolRequest`/`toolResponse` chunks to that same stream, per Genkit's own flow-streaming format — Backend forwards these unmodified, it doesn't re-wrap them:

```
{ "content": [{ "toolRequest": { "name": "analyze_pun", "input": { "text": string }, "ref"?: string } }] }
{ "content": [{ "toolResponse": { "name": "analyze_pun", "output": <the /analyze response shape above>, "ref"?: string } }] }
```

`output` is always a well-formed `/analyze`-shaped object per that endpoint's own graceful-degradation design (low `confidence` and `sense_source: null` on failure, never a raw error) — so the tool never needs a separate error signal at this layer.

Genkit's `ref` field exists to disambiguate concurrent calls to the *same* tool, but is inconsistently populated and unneeded here: `analyze_pun` is the only tool and is never called more than once concurrently in a single turn. So Frontend's `ChatModelAdapter` doesn't correlate by `ref` — it mints a `toolCallId` client-side the moment a `toolRequest` chunk for `analyze_pun` arrives, holds it as the one pending call, and attaches the next `toolResponse` chunk's `output` to that same assistant-ui `{ type: "tool-call", toolCallId, toolName, args, result }` part. If a second concurrent tool or genuinely concurrent `analyze_pun` calls are ever needed, this correlation rule needs revisiting alongside `ref`-based matching — not a case this project currently has.

This closes sync point 3 in [`project-spec.md`](project-spec.md)'s "Sync points."

### Failed replies

A reply that fails after streaming has started (the `200` is already sent, so the status can't change) ends with one error event instead of the final `result`:

```
error: { "error": { "status": string, "message": string } }
```

`message` is a user-facing sentence that Frontend can display as-is: Backend never forwards an upstream error's own message or details, and logs those server-side instead. `status` is Genkit's status code, kept for diagnostics (e.g. `UNAVAILABLE` or `DEADLINE_EXCEEDED` when the model is overloaded or slow, `RESOURCE_EXHAUSTED` when quota runs out, `INTERNAL` for anything unexpected); Frontend shouldn't branch on specific values. In Phase 2, a turn that fails after a `toolRequest` chunk ends with this event and no matching `toolResponse`, so Frontend has to settle that pending tool call itself. A request rejected before streaming starts (e.g. a body that doesn't match the shape above) gets a non-2xx JSON response instead, and a client that disconnects mid-reply gets no error event.
