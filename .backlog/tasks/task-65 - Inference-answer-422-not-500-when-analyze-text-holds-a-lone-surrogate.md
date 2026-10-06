---
id: TASK-65
title: 'Inference: answer 422, not 500, when /analyze text holds a lone surrogate'
status: In Progress
assignee:
  - '@yaitorr'
created_date: '2026-10-06 00:57'
updated_date: '2026-10-06 01:07'
labels: []
milestone: m-4
dependencies: []
references:
  - inference/main.py
  - docs/contracts.md
priority: low
ordinal: 61000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found in TASK-59's code review (2026-10-05). A JSON body whose `text` escapes a lone UTF-16 surrogate, e.g. `{"text":"a\ud800"}`, gets a 500 from Inference. Pydantic does reject the text (`string_unicode`), but FastAPI's default RequestValidationError handler echoes each error's `input` in the 422 body, and Starlette's JSONResponse then fails encoding the surrogate as UTF-8. docs/contracts.md promises a 422 for text Inference rejects, and Backend logs a 500 as cause non_2xx, which looks like an Inference outage. Backend can send such text, since JSON.stringify writes a lone surrogate as `\ud800`, though it is unlikely from Gemini's UTF-8 tool arguments. Nothing reads the 422 body today: Backend cancels it unread and Eval only sees the HTTPError.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 POST /analyze with a lone surrogate in `text` answers 422, and a test pins it
- [x] #2 Other validation failures (empty, blank, over 2,000 characters, missing or non-string text) still answer 422
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [x] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [x] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Register an @app.exception_handler(RequestValidationError) in inference/main.py that rebuilds FastAPI's default 422 body (JSONResponse(422, {detail: jsonable_encoder(errors)}), as fastapi/exception_handlers.py does) with each error's input removed (user's choice, 2026-10-05: no echo of the caller's text; removes the un-encodable-input crash at its source). Rebuilt rather than delegated, since delegating means constructing a new RequestValidationError.
2. Tests: lone surrogate answers 422; empty/blank/non-string/missing/malformed-JSON bodies answer 422 with no input in any error; a 422 still names the rule broken (type, loc).
3. docs/contracts.md: say the 422 body doesn't echo the input.
4. Code review subagent; architectural review since contracts.md changes; docs drift check.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Done per plan. Test-first: the 5 new test cases failed before the handler existed (500 for the surrogate, input present for the rest). Code + architectural reviews: nothing significant; applied readability of the malformed-JSON case, empty/blank added to the no-echo test, contracts wording scoped to the 422. Probed: no 422 field (msg, ctx, loc) carries caller text. Out of scope, pre-existing: invalid UTF-8 bytes get FastAPI's 400 body-parse error (Backend and Eval can't send them); docs/design/sense-selection.md:70 says /analyze never returns 500, but a contract-breaking result does (pinned by test_analyze_answers_500_when_a_result_breaks_the_contract).

Docs drift check: README.md, project-spec.md, local-setup.md and AGENTS.md don't describe Inference's error bodies; no follow-up commit needed. Validation: inference pytest 142 passed, ruff check + format.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Inference now answers 422, not 500, when /analyze's text holds a lone surrogate. A RequestValidationError handler returns FastAPI's default 422 body without each error's input, so the caller's text is never echoed back and text UTF-8 can't encode no longer crashes the response. docs/contracts.md describes the 422 body. Tests written first (they failed with the 500 and the echoed input) cover a lone surrogate, empty, blank, non-string, missing and malformed bodies, and that a 422 still names the rule broken. Code and architectural reviews found nothing significant.
<!-- SECTION:FINAL_SUMMARY:END -->
