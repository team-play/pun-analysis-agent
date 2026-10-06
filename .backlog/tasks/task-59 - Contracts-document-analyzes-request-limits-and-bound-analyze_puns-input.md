---
id: TASK-59
title: 'Contracts: document /analyze''s request limits and bound analyze_pun''s input'
status: In Progress
assignee:
  - '@yaitorr'
created_date: '2026-10-03 21:30'
updated_date: '2026-10-06 01:07'
labels: []
milestone: m-4
dependencies: []
references:
  - docs/contracts.md
  - inference/main.py
  - backend/src/tools/analyze-pun.ts
priority: medium
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
PR #85 made Inference's AnalyzeRequest reject blank text and text over pun_detector.features.MAX_CHARS (2,000 characters) with a 422, but docs/contracts.md still documents the request as just { "text": string }, and Backend's analyzePunInputSchema has no bound. So when Gemini calls analyze_pun on a long pasted passage, Inference answers 422, Backend logs it as an ordinary non_2xx failure and returns the undetermined result, and nobody can tell a limit from an outage; Eval counts it as a request error. Found in PR #85's architectural review (2026-10-03, recorded on TASK-16). This is a contract change, so it needs the architectural review AGENTS.md asks for.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 docs/contracts.md's /analyze request states the limits Inference enforces (non-blank, at most 2,000 characters) and its 422 response
- [x] #2 Backend's analyze_pun returns the undetermined result for text over the limit without calling Inference, and logs it with its own cause (too_long), so a limit is distinguishable from an outage in the logs and Gemini still judges the text itself
- [x] #3 Tests on each side pin the same limit, so changing it on one side alone fails a test
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [x] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [x] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Backend: in analyze_pun's handler, count the text's code points (Python's len, which Inference's max_length uses; JS .length counts UTF-16 units) and, over ANALYZE_TEXT_MAX_CHARS (2000), return the undetermined result with cause too_long, without calling Inference. Not a schema bound: Genkit's input validation throws INVALID_ARGUMENT and fails the whole reply, and chat.ts reuses analyzePunInputSchema for resent history, so saved threads holding a long call would be rejected.
2. Backend tests: 2000 code points calls Inference, 2001 doesn't and logs too_long; 2000 emoji (4000 UTF-16 units) still calls Inference. Literal 2000, not the constant.
3. Inference tests: pin MAX_CHARS with literal 2000/2001 at the boundary.
4. docs/contracts.md: /analyze request limits + 422; add too_long to when Backend returns the undetermined result.
5. Code review + architectural review subagents; docs drift check.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AC #2 reworded with the user (2026-10-05): the original 'fails as invalid input' would fail the whole chat reply (Genkit rethrows tool input validation errors as INVALID_ARGUMENT) and break saved threads that resend a long call. Chosen: undetermined result + distinct log cause, so Gemini still judges the text. Backend checks length only, not blankness.

Implemented per plan. Mutation-checked: counting UTF-16 units, Backend limit 2001, Inference MAX_CHARS 2001 each fail a test. Code review + architectural review (subagents) found nothing blocking; applied: log field renamed length->characters, over-limit test runs for 'x' and emoji, contracts.md 'Limits' narrowed (missing/non-string/limit-breaking text -> 422; extra fields ignored), emoji wording, deploy order for limit changes (contracts.md + engineering-practices.md now 'three kinds'), line-125 summary points at the undetermined-cases list, handler comment says blank text still reaches Inference. Known, out of scope: a JSON lone surrogate in text gets 500 from Inference (FastAPI's 422 handler fails echoing it back) -> follow-up suggested.

Docs drift check: README.md, project-spec.md, local-setup.md and AGENTS.md don't describe /analyze's limits or analyze_pun's log causes; no follow-up commit needed. contracts.md and engineering-practices.md were updated as part of the change. Validation: backend pnpm test 209/209, tsc, biome; inference pytest, ruff check + format.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Documented /analyze's request limits (non-blank, at most 2,000 code points, 422 otherwise) and the deploy order for changing them in docs/contracts.md and docs/engineering-practices.md. Backend's analyze_pun now skips Inference for text over 2,000 code points and returns the undetermined result logged as cause too_long, so a limit is no longer logged as a non_2xx outage and Gemini still judges the text. The input schema stays unbounded, because Genkit would fail the whole reply and resent history would be rejected. Both sides' tests pin the literal 2,000 at the boundary, including 2,000 emoji. Mutation-checked: UTF-16 counting and a limit of 2,001 on either side each fail a test. Code and architectural reviews done.
<!-- SECTION:FINAL_SUMMARY:END -->
