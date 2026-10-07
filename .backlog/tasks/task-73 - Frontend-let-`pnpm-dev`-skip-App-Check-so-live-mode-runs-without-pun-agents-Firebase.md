---
id: TASK-73
title: >-
  Frontend: let `pnpm dev` skip App Check so live mode runs without pun-agent's
  Firebase
status: To Do
assignee: []
created_date: '2026-10-07 10:47'
updated_date: '2026-10-07 10:47'
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
- [ ] #1 With `VITE_APP_CHECK=off` under `pnpm dev`, `live` mode sends `/api/chat` requests without loading Firebase or contacting it, and a local Backend with `APP_CHECK=off` answers them
- [ ] #2 Any other value of `VITE_APP_CHECK`, or none, keeps App Check on exactly as today; tests cover `off`, unset and a near-miss value like `false`
- [ ] #3 The skip is gated on `import.meta.env.DEV`, and a check fails if a production build's bundle contains the skip path
- [ ] #4 `frontend/.env.example`, `docs/local-setup.md` (Frontend section) and `docs/contracts.md` describe the switch, that it is dev-only, and that it needs Backend's `APP_CHECK=off`
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
