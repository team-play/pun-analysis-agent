---
id: TASK-25
title: Protect /api/chat with Firebase App Check
status: To Do
assignee: []
created_date: '2026-09-23 09:50'
labels: []
dependencies:
  - TASK-13
references:
  - docs/contracts.md
  - backend/src/app.ts
  - frontend/src/lib/chat/live-chat-model-adapter.ts
type: feature
project: backend
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Once TASK-13 deploys Backend to Cloud Run, /api/chat is a public URL that spends the team's Gemini quota for any caller. The Gemini key sits server-side (that's the point of the proxy), so callers don't need one. CORS only restrains browsers, and the Cloud Run service has to allow unauthenticated calls so the Firebase-hosted app can reach it. So anyone who finds the *.run.app URL (visible in the frontend's network requests) can drive Gemini usage until quota runs out and real users get the 'usage limit' error. Decided during TASK-13 planning (2026-09-23) to handle this as its own task: TASK-13 only bounds the damage (Cloud Run instance caps; a Gemini key in a project without billing, so Google's free-tier limits cap usage rather than billing it).

Firebase App Check makes Backend accept only requests carrying a token that attests they came from our Firebase-hosted app (reCAPTCHA-based attestation on web). It spans both domains: Frontend obtains the token (Firebase JS SDK) and sends it with each /api/chat request; Backend verifies it (firebase-admin) before running the flow. Both are new dependencies, which affects bundle size and Cloud Run cold start (AGENTS.md's Performance section), and the request header becomes part of the /api/chat contract, so this needs an architectural review. It may be worth splitting into Backend and Frontend tasks when picked up, as TASK-23/TASK-24 were.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Backend rejects /api/chat requests without a valid App Check token before invoking the flow, so they never reach Gemini
- [ ] #2 The deployed frontend attaches a valid App Check token to every /api/chat request, and a real conversation still completes end-to-end
- [ ] #3 Local dev and CI keep working without real attestation (e.g. App Check debug tokens or a documented off switch), per docs/engineering-practices.md's isolation rule
- [ ] #4 docs/contracts.md documents the App Check header on /api/chat
- [ ] #5 Accept/reject behavior is covered by tests that need no network or real tokens (verifier injected or mocked)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
