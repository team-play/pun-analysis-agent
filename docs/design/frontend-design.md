# Frontend Design — Component Library, Visual Design & State

Complements [`../project-spec.md`](../project-spec.md). Owned by the Frontend domain; consumes the `/api/chat` contract only (see [`../contracts.md`](../contracts.md)) — no dependency on Inference. See [`../engineering-practices.md`](../engineering-practices.md) for the cross-domain isolation/testing/progressive-enhancement rules this doc builds on (the "Development & testing" and "Tool-call visibility" sections below are the frontend-specific mechanics for those rules).

---

## Component library

**Decision:** [assistant-ui](https://www.assistant-ui.com/)'s pre-styled `Thread` component, starting from its default Tailwind/shadcn theming and enhancing it toward a Claude-inspired look via Tailwind theme tokens. No custom semantic CSS layer, no from-scratch stylesheet — customization stays within what the default theme exposes.

> Chat behavior and state (composer, message list, streaming, keyboard handling, tool-call display) come from assistant-ui's pre-styled `Thread`, with a custom `RemoteThreadListAdapter` backed by `localStorage` for thread list + per-thread message history (no server persistence). Sessions always start on a fresh thread; prior threads are available from the list but never auto-resumed. Visual design starts from the default theme and is adjusted toward a Claude-inspired look via Tailwind tokens — simplicity stays the priority over a fully custom design system.

### Why assistant-ui

- Framework-agnostic — not coupled to Next.js, drops cleanly into Vite + TanStack Start.
- The pre-styled `Thread` gives a complete, polished chat UI out of the box — best ratio of effort to "looks nice" for the project timeline, without assembling primitives by hand.
- Handles the hard chat-specific plumbing (streaming, auto-scroll, keyboard shortcuts, tool-call state) so custom work stays scoped to adapters and later theming, not chat mechanics.
- Still built on CSS variables for theming, so adjusting colors/spacing later doesn't mean touching component internals.

### Alternatives considered and rejected

| Option | Why not |
|---|---|
| Vercel AI Elements | Polished, but docs/CLI assume a Next.js project; would need workarounds under TanStack Start. |
| assistant-ui headless primitives + custom CSS | More visual control, but full custom CSS work isn't needed to reach a Claude-inspired look — the default theme's Tailwind tokens get us there with far less effort. |
| TanStack AI (`@tanstack/ai-react`, `/ui`) | Overlaps assistant-ui's own job (state management + headless UI), not complementary at that layer. Its provider-agnostic adapter layer would only be useful if we needed to swap model providers, which we don't (Gemini via Genkit is fixed). Skipped entirely to keep one library owning chat state. |

---

## Visual design

Start from assistant-ui's default `Thread` theming to get a working interface quickly, then adjust it toward a Claude-inspired look — calm and content-focused rather than dense or "chat app"-styled — by tuning the existing Tailwind theme tokens rather than overriding or replacing them. Not a literal clone of Claude's interface; describes a target design language, not fixed values. Simplicity stays the priority over a fully custom design system.

- **Palette:** warm neutral base (off-white, not pure white; warm dark gray in dark mode), one restrained accent color for primary actions only. Text hierarchy via weight/opacity rather than added hues.
- **Typography:** clean sans-serif, generous line-height, minimal type scale (body, meta, greeting headline).
- **Layout:** centered content column with a max-width for readable line length; spacing (not borders/shadows) separates message turns; no heavy chat bubbles for assistant responses.
- **Header:** simple — logo + team name, no heavy toolbar.
- **Thread list (sidebar):** minimal, quiet dividers; delete affordance appears on hover rather than always visible.
- **Accent color:** inspired by, not matched to, Purdue's brand palette (Boilermaker Gold `#CFB991`, Black `#000000`) — used subtly as the single accent (active states, primary actions) rather than aiming for full brand fidelity. It reads as a warm gold in the same family as the Claude-inspired warm-neutral palette, so it should sit naturally rather than standing out as a "school color."

---

## Major components

### 1. Theme
Starts from assistant-ui's default Tailwind/shadcn theme (light/dark mode included out of the box), tuned toward the Claude-inspired palette/typography above via theme tokens.

### 2. Chat
- **Greeting state:** vertically centered, generous negative space, short headline, prominent input field. Transitions to the chat view once the first prompt is sent.
- **Chat state:** message list scrolls, input field docks to the bottom as a persistent rounded field.
- **Session behavior:** always starts on a fresh thread on load — no auto-resume of the last active thread.
- **Export/reset:** conversation can be copied to clipboard as JSON (for eval) or reset, independent of the persistence layer — read directly off the runtime's message state.

### 3. Thread list
- Backed by a custom `localStorage`-based `RemoteThreadListAdapter` (list, create, rename, archive, delete) — no server persistence.
- Per-thread messages persisted via `ThreadHistoryAdapter`, also `localStorage`-backed.
- A thread is only written to the stored list once the first message is sent (guarded via the adapter's `initialize()`), to avoid accumulating empty "New Chat" entries on every page load.
- Individual threads deletable from the list.
- **Schema drift across phases:** Phase 1 threads persist text-only message parts; Phase 2 adds `tool-call` parts to the shape `ThreadHistoryAdapter` writes. Persisted threads aren't version-tagged, so a thread saved under Phase 1 and reopened after Phase 2 ships is only guaranteed to render if the adapter treats missing tool-call parts as absent rather than malformed — worth an explicit check when Phase 2 lands, or a "clear local storage" note for dev environments if not.

---

## Development & testing

Per [`../engineering-practices.md`](../engineering-practices.md)'s isolation rule, Frontend must be fully buildable and testable without a live Backend. assistant-ui's `ChatModelAdapter` is the seam that makes this possible: it's the one place that knows how to reach `/api/chat`, so it's also the one place that needs swapping to remove that dependency.

- **Stub adapter.** A `StubChatModelAdapter` implementing the same `run()` interface as the real one, returning canned responses instead of calling `/api/chat`. At minimum it needs two fixtures: a plain-text-only stream (Phase 1 shape) and a text-plus-`tool-call` stream (Phase 2 shape, once that lands — see "Tool-call visibility" below). Local dev picks between the stub and a real running Backend via a build-time env flag (e.g. `VITE_CHAT_ADAPTER=stub|live`, named here so [`../local-setup.md`](../local-setup.md) can document it once it's built); CI and unit tests always use the stub.
- **CORS.** Pointing the `live` flag at a real Backend crosses origins even locally (frontend on `:5173`, backend on `:8080` per [`../local-setup.md`](../local-setup.md)) — Backend needs CORS middleware enabled for that flag to work at all, and the same applies to the deployed pairing (Firebase Hosting calling Cloud Run). Tracked as Backend-side work, not Frontend's, but flagged here since it blocks this flag either way.
- **Unit test scope.** Component rendering (greeting → chat transition, message rendering, loading/error states), the `RemoteThreadListAdapter` and `ThreadHistoryAdapter` logic against a fake/in-memory `localStorage`, and — once built — the custom `ChatModelAdapter`'s Genkit-stream-event parsing logic, exercised against recorded fixture events rather than a live stream. None of this requires a running Backend, Inference service, or Gemini quota, so it runs safely in CI on every push/PR ([`.github/workflows/test.yml`](../../.github/workflows/test.yml)), alongside the existing lint job.
- **Framework: Vitest + React Testing Library.** Already wired up — `frontend/`'s `pnpm test` runs `vitest run` (config in [`../../frontend/vite.config.ts`](../../frontend/vite.config.ts)'s `test` block, jest-dom matchers registered in [`../../frontend/src/setupTests.ts`](../../frontend/src/setupTests.ts)). Chosen over Jest for native Vite/ESM config reuse (one config object, no separate transform setup) and over `node:test` (Backend's choice, per [`../engineering-practices.md`](../engineering-practices.md)) because component tests need a DOM (`jsdom`) and React-aware queries, which Testing Library provides directly.
- **Fixture sharing.** The stub's fixtures should track the real `/api/chat` shape in [`../contracts.md`](../contracts.md) closely enough that swapping the stub for the real adapter doesn't require touching component code — worth revisiting once the real stream shape is confirmed against Backend's Phase 1 implementation.

---

## Tool-call visibility

Since Genkit isn't one of assistant-ui's built-in framework adapters, the Backend↔Frontend link always goes through a **custom `ChatModelAdapter`** — this isn't Phase-2-only infrastructure. Even Phase 1's plain-text Gemini proxy needs it: `run()` has to parse Genkit's stream events into assistant-ui's message parts before any real backend (not just the stub) can be wired up at all, per [`../engineering-practices.md`](../engineering-practices.md)'s progressive-enhancement plan.

What *is* Phase 2 work is extending that same adapter to also parse `tool-call` events — it only becomes buildable once Backend's `analyze_pun` tool exists (or, per the isolation rule above, once a fixture standing in for its stream shape exists):

- Requires a small translation layer: parsing Genkit's tool-call stream events into assistant-ui's `{ type: "tool-call", toolName, toolCallId, args }` part shape (plus the eventual result).
- assistant-ui tracks call status (`running` → `complete`) natively, so the UI can show the `analyze_pun` tool call live as it fires and resolves — either via assistant-ui's default tool-call rendering, or a custom "Generative UI" component registered for that specific tool name if we want bespoke styling for it.

---

## Open items

- Identify which of the default theme's Tailwind tokens (colors, spacing, radii) to override to reach the Claude-inspired palette/layout, once the interface is running against real content.
- Settle on the exact accent shade (a muted gold in the Boilermaker Gold family, not the literal brand hex) once it's tested against the warm-neutral background for contrast/accessibility.
- Confirm the Genkit stream event shape for tool calls once the Backend domain's `/api/chat` contract is finalized, to lock down the adapter's parsing logic — this is now tracked as a formal sync point in [`../project-spec.md`](../project-spec.md), not just an incidental TODO.
- The shared stub-fixture format (so Frontend's stub and Backend's Phase 2 fixture don't drift apart) is still open — see [`../engineering-practices.md`](../engineering-practices.md)'s open items.
- The one test that exists today (`frontend/src/App.test.tsx`) only smoke-tests the default Vite starter page — it gets replaced once the real greeting/chat UI lands, not extended.
- CORS middleware on Backend (needed for the `live` adapter flag and for the deployed Firebase↔Cloud-Run pairing) isn't implemented yet — flagged in "Development & testing" above, owned by Backend.
