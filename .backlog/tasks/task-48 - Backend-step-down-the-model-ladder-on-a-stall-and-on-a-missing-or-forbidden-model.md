---
id: TASK-48
title: >-
  Backend: step down the model ladder on a stall and on a missing or forbidden
  model
status: To Do
assignee: []
created_date: '2026-09-29 09:54'
labels: []
dependencies:
  - TASK-43
references:
  - backend/src/flows/model-ladder.ts
  - backend/src/flows/stall-guard.ts
  - docs/contracts.md
  - packages/timeouts/index.js
priority: medium
type: enhancement
project: backend
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-43's ladder (backend/src/flows/model-ladder.ts, ACTION_BY_STATUS) retries a stall like a 503, with up to 3 attempts per model, and fails the reply on any status it doesn't list. Two cases came up after it shipped:

- Stalls use up the retry budget before the ladder can step down. A stall costs the full MODEL_STALL_LIMIT_MS (30 s) where a 503 costs under a second, so three stalls on the first model (30 + 1 + 30 + 2 + 30 = 93 s) exceed RETRY_BUDGET_MS (80 s), and the reply fails without trying another model. TASK-45 hit this with gemini-3.8-flash on the top rung, and moving Flash to the last rung only avoided it for that model. In TASK-45's runs a model that stalled kept stalling, and a stall usually means that model is overloaded right now, so another model is the better next try. Stepping down after one stall fits all three models in the current budget (30 + 30 s, then the last model's attempt, which the baseline already counts), so no timeout needs raising.
- NOT_FOUND (404) and PERMISSION_DENIED (403) fail the reply, but both can be specific to one model: a shut-down or renamed model (gemini-3.1-flash-lite can be shut down from 2027-05-07), or one this project can't use. TASK-45 found gemini-2.5-flash-lite answering 404 for this project and removed it from the ladder; with this change, a model like that would be skipped instead of failing every reply that reaches it. An invalid API key also answers 403, which then costs two extra fast-failing requests before the reply fails; that trade was accepted.

Decided with the user on 2026-09-29: a stall steps down after one attempt (TASK-32's time-to-first-chunk measurements could later justify allowing two); a 504 from Gemini itself, which arrives quickly, keeps the normal backoff like a 503. The stall guard tags its own failures with detail.cause "model_stalled" (backend/src/flows/stall-guard.ts), which is what tells the two apart, since both are DEADLINE_EXCEEDED.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A model call that stalls (DEADLINE_EXCEEDED with detail.cause "model_stalled") steps down to the next model without a backoff wait; with the current values, a reply whose every attempt stalls reaches all three models within RETRY_BUDGET_MS
- [ ] #2 A DEADLINE_EXCEEDED from Gemini itself (a 504, without the stall cause) keeps the normal backoff, as UNAVAILABLE does
- [ ] #3 NOT_FOUND and PERMISSION_DENIED step down to the next model at once; any other unlisted status still fails the reply
- [ ] #4 A stall or 403/404 on the pegged model still fails the reply rather than stepping down (TASK-43 AC #4)
- [ ] #5 Tests with Genkit test-double models fail if any of these mappings is removed, including a test that a stall on every model reaches the last model with the real RETRY_BUDGET_MS and MODEL_STALL_LIMIT_MS
- [ ] #6 docs/contracts.md's "Retries." section and the policy's doc comment state the new rules
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
