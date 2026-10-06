---
id: TASK-53
title: 'Backend: warm Inference from /api/chat before analyze_pun needs it'
status: Done
assignee:
  - '@yaitorr'
created_date: '2026-10-02 10:04'
updated_date: '2026-10-06 01:27'
labels: []
milestone: m-4
dependencies:
  - TASK-51
  - TASK-52
references:
  - backend/src/routes/chat.ts
  - docs/project-spec.md
priority: medium
project: backend
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Inference scales to zero, so the first analyze_pun call after it has been idle waits for its cold start and can exceed `INFERENCE_TIMEOUT_MS`, degrading to the undetermined result. Gemini spends seconds on its first model turn before calling the tool, so starting Inference's cold start when a chat request arrives hides most of it. Backend can stay warm while Inference idles out (chats without puns keep Backend busy), so warming only when Backend starts is not enough. Decided with Yai on 2026-10-02: no background job, since Cloud Run throttles CPU between requests and AGENTS.md's Performance section rules out polling; no chat ID, since /api/chat is stateless and adding one would change the contract; Inference concurrency stays at 1, since the ping only matters while Inference is cold.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An /api/chat request sends `GET /health` to Inference when Backend has not sent one in the last 5 minutes; the ping never delays or fails the chat reply
- [x] #2 The ping carries Backend's ID token like analyze_pun's calls, and a failed ping is logged and not retried
- [x] #3 Tests cover: the first request pings, a request inside the window does not, a request after the window does, and a failing ping leaves the reply unaffected
- [x] #4 docs/contracts.md and docs/project-spec.md describe the warm-up as a Backend-to-Inference dependency, and an architectural review is done
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [x] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [x] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. middleware/inference-warmup.ts: warmInference({fetch, inferenceUrl, intervalMs = 5 min, now = Date.now}) Hono middleware. Leading-edge throttle: pings GET /health when no ping was *sent* in the last intervalMs, records the send time before the request goes out (Inference concurrency 1: concurrent chats during a cold start must not each ping), never awaits it, no timeout and not tied to the chat's abortSignal.
2. Failed ping (reject, auth error, non-2xx) logged with logger.warn, not retried; the timestamp stays so the next chat within the window doesn't retry either.
3. app.ts: register on POST /api/chat after App Check, reusing the same createInferenceFetch as analyze_pun (ID token, origin check, no redirects).
4. Tests first (tests/middleware/inference-warmup.test.ts): first request pings with the Inference URL's /health, inside the window doesn't, at/after the window does, a rejecting and a hanging ping leave the reply unaffected and log.
5. Docs: contracts.md + project-spec.md describe the warm-up as a Backend->Inference dependency; architectural + code review subagents.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented middleware/inference-warmup.ts (leading-edge throttle, timestamp at send) wired after App Check in app.ts with the shared inferenceFetch. Code + architectural reviews done. Fixes applied from them: corrected the reason for recording at send time (Inference is --max-instances=1 --concurrency=1, so extra pings would queue ahead of /analyze, not start instances); hang guards on never-answering tests; body-cancel and errorCode tests; positive wiring test (tests/app.warmup.test.ts, APP_CHECK=off + malformed body); networkErrorCode moved to inference-fetch.ts; docs (contracts, project-spec, engineering-practices, local-setup, timeouts comment) and a note on TASK-32 that INFERENCE_TIMEOUT_MS must cover an unassisted cold start. 216/216 backend tests pass; mutations of each design rule are caught.

Window kept at 5 min (decided with Yai 2026-10-05): a shorter window would add pings competing with /analyze for Inference's single request slot and wake it more often, for a gain only when Cloud Run reclaims Inference inside the window. Validation: backend pnpm test 216/216, tsc and biome clean, packages/timeouts tests 7/7. Docs drift: README/AGENTS.md unaffected.

Deploy verified 2026-10-06 after PR #110 (merge 1d2f087; Deploy Backend succeeded): one greeting chat on https://pun-agent.web.app (~1 Gemini request, no analyze_pun call) got a normal reply, and pun-agent-inference logged GET /health 200 from user agent node at 01:27:17Z, 6 s after the chat was sent, so the ping went out and its ID token was accepted. pun-agent-backend logged no warm-up warnings.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Backend now warms Inference from /api/chat: backend/src/middleware/inference-warmup.ts sends GET /health, not awaited and with analyze_pun's ID-token fetch, when no ping was sent in the last 5 min, registered after App Check so only attested requests can start a cold start. The window counts from the last ping sent so pings during a cold start don't queue ahead of /analyze in Inference's single request slot; failures are logged (with the network error code) and not retried. Verified by tests/middleware/inference-warmup.test.ts (first ping, inside/after the window, window from last ping not last chat, in-flight dedupe, hanging and failing pings leave the reply unaffected, body cancelled) and app/app.warmup tests (no ping for App-Check-rejected requests; ping once App Check passes), each checked by mutating the rule it covers. contracts.md, project-spec.md, engineering-practices.md, local-setup.md and the INFERENCE_TIMEOUT_MS comment describe the dependency; code and architectural reviews done and their findings applied.
<!-- SECTION:FINAL_SUMMARY:END -->
