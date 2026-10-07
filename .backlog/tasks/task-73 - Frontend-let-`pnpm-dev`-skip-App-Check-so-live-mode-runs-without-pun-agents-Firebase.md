---
id: TASK-73
title: >-
  Frontend: let `pnpm dev` skip App Check so live mode runs without pun-agent's
  Firebase
status: In Progress
assignee:
  - '@yaitorr'
created_date: '2026-10-07 10:47'
updated_date: '2026-10-07 11:10'
labels: []
dependencies: []
references:
  - frontend/src/lib/firebase/app-check.ts
  - frontend/src/lib/chat/live-chat-model-adapter.ts
  - frontend/.env.example
  - docs/contracts.md
  - docs/local-setup.md
priority: medium
type: enhancement
project: frontend
ordinal: 66000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Contributors should be able to run the whole app locally without depending on the deployed `pun-agent` environment. Backend already has `APP_CHECK=off` for local use, but the frontend's `live` mode always gets an App Check token from Firebase project `pun-agent` (`frontend/src/lib/firebase/app-check.ts`). Locally that needs a debug token registered in our Firebase console and shared through 1Password, so a contributor with only their own Gemini key can't use the real chat UI. The live adapter waits for a token before sending (`frontend/src/lib/chat/live-chat-model-adapter.ts`), so Backend's `APP_CHECK=off` doesn't help. Confirm first that an unregistered debug token really does fail the request; that was read from the code, not run.

The switch must never ship. Gating it on `import.meta.env.DEV` (the same gate as the existing debug-token branch) makes `vite build` drop it, because Vite replaces the flag with a literal false. Like Backend's switch, it should take only the exact value `off`. The deployed Backend enforces App Check regardless, so even a shipped skip would fail closed. Changing when the frontend sends `X-Firebase-AppCheck` touches the App Check guarantee in `docs/contracts.md`, so AGENTS.md's architectural review applies.

Companion task: TASK-74 (binding a personal Gemini key).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 With `VITE_APP_CHECK=off` under `pnpm dev`, `live` mode sends `/api/chat` requests without loading Firebase or contacting it, and a local Backend with `APP_CHECK=off` answers them
- [x] #2 Any other value of `VITE_APP_CHECK`, or none, keeps App Check on exactly as today; tests cover `off`, unset and a near-miss value like `false`
- [x] #3 The skip is gated on `import.meta.env.DEV`, and a check fails if a production build's bundle contains the skip path
- [x] #4 `frontend/.env.example`, `docs/local-setup.md` (Frontend section) and `docs/contracts.md` describe the switch, that it is dev-only, and that it needs Backend's `APP_CHECK=off`
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [x] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [x] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm an unregistered debug token fails before reaching Backend (run pnpm dev live).
2. Make the live adapter's App Check getter optional; with none, omit X-Firebase-AppCheck.
3. In getChatModelAdapter, skip startAppCheck when import.meta.env.DEV && VITE_APP_CHECK === "off" (inline, so the minifier drops it), warning in the console.
4. Tests for off / unset / near misses / off outside dev; isolate from a contributor's .env.local.
5. CI: test.yml builds a live bundle with VITE_APP_CHECK=off and fails if the warning is in it; deploy-frontend.yml refuses a bundle containing it.
6. Docs: frontend/.env.example, local-setup.md, contracts.md; follow-up commit for drift in engineering-practices.md and backend/.env.example.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verified by running it: with VITE_APPCHECK_DEBUG_TOKEN set to an unregistered UUID, Firebase's token exchange returns 403 (appCheck/fetch-status-error) and no request reaches localhost:8080.

The gate must be inline. With the condition in a helper (const skipsAppCheck = () => DEV && ...), vite build turned it into ()=>!1 but the minifier did not inline the call, so the dead branch and its warning stayed in the bundle. Inline, a live build with VITE_APP_CHECK=off has no trace of it; the same build with the DEV gate removed does (negative control).

End to end (pnpm dev, VITE_APP_CHECK=off; local Backend APP_CHECK=off, no GEMINI_API_KEY): fresh tab loads no firebase SDK chunks and makes no Google requests; POST /api/chat returns 200 and reaches the flow, which then fails FAILED_PRECONDITION for the missing key. A full Gemini reply waits for a personal key (TASK-74).

Reviews: code review mutation-tested the new tests (truthiness, dropped DEV gate, empty header, startAppCheck still called, case-insensitive match, changed warning text: all caught). Fixed from review: tests now clear VITE_APP_CHECK in beforeEach (a contributor's .env.local with off broke 2 tests), restoreAllMocks for the warn spy, CI grep has a positive control so a missing dist can't pass silently. Architectural review: boundary holds; test.yml is not a required check and deploy-frontend.yml doesn't wait for it, so the bundle grep was added to the deploy build too, and docs now say the deploy refuses such a bundle. Known residual: NODE_ENV=development vite build keeps the skip (DEV true); no workflow does this, and the deployed Backend fails closed.
<!-- SECTION:NOTES:END -->
