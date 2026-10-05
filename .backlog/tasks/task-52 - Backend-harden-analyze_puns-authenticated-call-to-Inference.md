---
id: TASK-52
title: 'Backend: harden analyze_pun''s authenticated call to Inference'
status: Done
assignee:
  - '@yaitorr'
created_date: '2026-10-02 10:04'
updated_date: '2026-10-05 10:58'
labels: []
milestone: m-4
dependencies:
  - TASK-11
references:
  - backend/src/tools/inference-fetch.ts
  - backend/src/tools/analyze-pun.ts
  - .github/workflows/deploy-backend.yml
priority: medium
project: backend
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
PR 85 added `backend/src/tools/inference-fetch.ts`, a hand-written metadata-server client that attaches an ID token on Cloud Run. It has no tests, detects Cloud Run from `K_SERVICE` separately from `config.ts`, fetches a token on every call, and a failed token fetch is logged as cause "unreachable", which points whoever reads the logs at networking instead of auth. `deploy-backend.yml` resolves `INFERENCE_URL` with `echo "url=$(gcloud ...)"`, so a failed lookup does not fail the step and surfaces later as Backend failing to start on `new URL("")`. Backend's new probabilities rule is untested, and nothing in Backend says why `probabilities` is optional: threads saved in the browser before the field existed still send results without it. Decided 2026-10-02: use google-auth-library, already in the production dependency tree through firebase-admin.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 ID tokens come from google-auth-library, at the major version firebase-admin already pulls in so the image does not grow, with token caching; the hand-written metadata client is removed
- [x] #2 Whether Backend runs on Cloud Run is decided once, in `config.ts`
- [x] #3 A failed token fetch is logged with its own cause, distinct from unreachable, timeout and non_2xx
- [x] #4 Tests cover `INFERENCE_URL` validation, the token being attached only on Cloud Run and only for Inference's origin, and the token-failure log cause
- [x] #5 Tests cover the probabilities rule: summing to 1, agreeing with confidence, absent when the result is undetermined, and an omitted field accepted
- [x] #6 A comment on the Zod `probabilities` field says why it is optional
- [x] #7 `deploy-backend.yml` fails the step that resolves Inference's URL when the URL cannot be read
- [x] #8 Backend's own undetermined result (`UNDETERMINED_ANALYZE_RESULT`) carries `probabilities: null`, as docs/contracts.md describes the undetermined result, and a test pins it (found during TASK-57: it currently omits the key, which Frontend tolerates)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [x] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [x] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Tests first for createInferenceFetch (URL validation, token only on Cloud Run and only for Inference's origin, auth failure).
2. Add google-auth-library@^11.1.0 (same major as firebase-admin); inference-fetch takes { onCloudRun, getAuthHeaders } and defaults to a lazily created, reused IdTokenClient (the token cache is the library's; reusing the client is ours and tested).
3. config.ts exports onCloudRun; inference-fetch no longer reads K_SERVICE.
4. Token failure throws InferenceAuthError (reason in the message); analyze_pun logs cause=auth. A timeout during the token fetch still logs as timeout.
5. probabilities: comment why optional, probabilities: null on UNDETERMINED_ANALYZE_RESULT, tests for the rule.
6. deploy-backend.yml: bare assignment + non-empty guard for INFERENCE_URL.
7. Docs (scope added with user's OK): local-setup.md says Inference deploys first; engineering-practices.md names that dependency as an exception to independent deploys; contracts.md lists every fallback cause. Architectural review + code review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
From PR #85's architectural review (2026-10-03, on TASK-16): deploy-backend.yml resolves INFERENCE_URL with gcloud run services describe pun-agent-inference, so Backend's deploy now needs the Inference service to exist; in a fresh project (or if Inference is deleted) the URL is empty and Backend fails at startup (new URL('')) instead of degrading to the undetermined result. That contradicts engineering-practices.md's claim that deploys don't block on each other; besides the empty-URL guard here, say in local-setup.md's one-time GCP setup that Inference deploys first.

Implemented all ACs. Token fetch is raced against analyze_pun's abort signal (google-auth-library's getRequestHeaders takes none), so a hung token fetch still ends at INFERENCE_TIMEOUT_MS and logs as timeout, not auth. InferenceAuthError puts the underlying reason in its message because Genkit's logger drops err.cause.
Architectural review: no blocking issues; fixed contracts.md's fallback-cause list (added non-2xx and auth), a stale Frontend fixture comment, and qualified engineering-practices.md's 'deploy independently'.
Code review: added tests for reusing one IdTokenClient and retrying a failed client creation (mutation-checked), an already-aborted signal, the auth reason in the message, a history test in chat.test.ts for results without probabilities, and isolated the probabilities-on-undetermined test. Backend: 205 tests pass, tsc clean, Biome and actionlint clean.

Finalization evidence (2026-10-05, branch claude/task-52-ab6208, PR #104): pnpm test 205/205; per-AC test runs by name (client reuse/retry, onCloudRun, cause=auth + reason in message, 17 inference-fetch URL/token/origin tests, 7 probabilities tests incl. chat history and UNDETERMINED probabilities: null). AC7: ran the step's script under bash -e with a stand-in gcloud: failing lookup rc=1, empty URL rc=1, URL present rc=0 and url= written to GITHUB_OUTPUT. pnpm why: backend's google-auth-library resolves to firebase-admin's 11.1.0. Not exercised: the real deploy and a real Cloud Run token fetch, which run on merge to main.

Post-merge (2026-10-05): PR #104 merged as d10bcaf. Deploy Backend run 37292036378 succeeded: 'Resolve private Inference service', the Cloud Run deploy, and both smoke tests passed. Production logs since the deploy show no analyze_pun calls yet, so no Cloud Run token fetch has been observed; no cause=auth warnings either. First real analyze_pun call should show an authenticated /analyze request on pun-agent-inference.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced Backend's hand-written metadata-server client with google-auth-library's IdTokenClient (v11, already in the image via firebase-admin), kept across calls so its token cache applies; Cloud Run detection moved to config.onCloudRun. A failed token fetch is logged as cause=auth with its reason, while a timeout during it still logs as timeout. UNDETERMINED_ANALYZE_RESULT carries probabilities: null, and the probabilities rules and optional field are tested and commented. deploy-backend.yml fails the Inference URL step on a failed or empty lookup, and the docs say Inference deploys first. Verified with Backend's tests (205 pass), the workflow step run under bash -e against a stand-in gcloud, an independent code review and an architectural review (all findings fixed). PR #104.
<!-- SECTION:FINAL_SUMMARY:END -->
