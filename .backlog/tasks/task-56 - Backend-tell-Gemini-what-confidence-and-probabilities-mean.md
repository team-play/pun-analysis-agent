---
id: TASK-56
title: 'Backend: tell Gemini what confidence and probabilities mean'
status: Done
assignee:
  - '@yaitorr'
created_date: '2026-10-02 10:04'
updated_date: '2026-10-06 01:32'
labels: []
milestone: m-4
dependencies:
  - TASK-16
references:
  - backend/src/flows/system-instruction.ts
priority: medium
project: backend
ordinal: 52000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
analyze_pun's output carries `confidence` and, since PR 85, `probabilities`: raw, uncalibrated detector output (docs/contracts.md). The system instruction (backend/src/flows/system-instruction.ts) never explains either, so Gemini, the Flash-Lite models especially, may present them as certainty ("the model is 93% sure"). Decided with Yai on 2026-10-02: Otto describes them in words, and the exact numbers stay in Frontend's tool-call card, which shows them next to an uncalibrated hint. TASK-20 adds a neighbouring paragraph for llm_fallback results.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The system instruction says `confidence` and `probabilities` are uncalibrated model output and tells Gemini to describe them in words, never as a percentage or a certainty
- [x] #2 The new paragraph is consistent with TASK-20's llm_fallback guidance
- [x] #3 A recorded check, in the style of docs/experiments/task-47, shows the production models following it on several analyzed texts, including one with an uncertain class split
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [x] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [x] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add DETECTOR_SCORES_RULE to backend/src/flows/system-instruction.ts: scores are raw/uncalibrated, describe firmness in words, never numbers or certainty, point to the analysis card for exact scores, and say 'pun but unclear which kind' on a close homographic/homophonic split (option (a) + split sentence, decided with Yai 2026-10-05). Keep it to detection and non-binding, so TASK-20 can still judge an llm_fallback text not a pun.
2. Extend chat.test.ts's paragraph-inclusion test to cover it.
3. docs/experiments/task-56: record real Inference results for 4 texts (clear pun, clear non-pun, class split, tentative call just over the 0.32 threshold), replay them through createChatFlow on both Flash-Lite models, 3 runs each plus a 'give me a percentage' prompt; grade against a scale fixed before reading.
4. Code + architectural review, docs drift check.

5. After review: scope the analysis-card pointer to results that have scores (applied, not re-run); the 'which way it leans' rewording is deferred to TASK-20 with a note there (decided with Yai 2026-10-06).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Gemini quota estimate (2026-10-05): 5 prompts x 2 models x 3 runs = 30 replies, each >= 2 requests (tool call + answer) => ~60-70 requests, ~30-35 per Flash-Lite model, well under half of 500/day. One model pinned per flow, one request at a time, paced at <=10/min per model, stops at first 429. Yai approved running it.

Run 1 (2026-10-06 00:55 UTC): gemini-3.5-flash-lite ignored the class-split sentence (0/3 unprompted, 2/3 when asked for a percentage); otherwise all replies followed. Revised with Yai: the split sentence now comes right after the scores' definition and is tied to pun_type ('only the more likely of the two kinds'). Run 2: another ~65 requests, ~65 per model for the day in total, still under half of 500/day.

Run 2 (2026-10-06 01:05 UTC): class split followed 3/3 on both models; tentative 3/3 (3.5) and 1/3 (3.1, accepted by Yai: the replies just don't mention the scores); asks-for-a-percentage 1/3 and 0/3, both pointing to the card but often dropping the split, and 3.1 twice calling the classifier 'quite certain'. Yai accepted run 2's wording. Full grading in docs/experiments/task-56/README.md. Also found: detector false positives on plain sentences (separate session) and an empty Gemini reply (TASK-67).

Validation 2026-10-06: backend tests 205/205 pass (chat.test.ts fails if DETECTOR_SCORES_RULE is dropped from SYSTEM_INSTRUCTION); biome and ruff clean. Independent code review done: grading spot-checked against runs/*.json and matched; 429 stop verified; findings fixed (README states the percentage-case regression, grading clarifications, pacing comment, lint). Architectural review not needed: no change to contracts.md, topology, isolation or dependencies. Docs drift: README, project-spec, local-setup and AGENTS.md checked, none needed changes.

Merged in #117 as 5496486. Deploy Backend run 37399256845 on 5496486 succeeded, including the /health and App Check smoke tests; pun-agent-backend-00025-s6g (image backend:5496486) serves 100% of traffic. Not re-checked live, to spare Gemini quota (decided with Yai 2026-10-06): the change is only the system-instruction text, and docs/experiments/task-56 already recorded both production Flash-Lite models following this exact wording. To spot a regression in production, look for a reply that gives confidence or probabilities as a number or percentage, or calls the classifier certain.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added DETECTOR_SCORES_RULE to Gemini's system instruction (backend/src/flows/system-instruction.ts). It says confidence and probabilities are raw, uncalibrated classifier scores, to be described in words and never as a number or certainty; that a close homographic/homophonic split means 'a pun, but unclear which kind'; and that a low score alone isn't a 'not a pun' verdict (the detector's threshold is ~0.32). Exact scores are left to Frontend's analysis card. It covers detection only and doesn't make is_pun binding, so it stays consistent with TASK-20. Verified with a recorded live check (docs/experiments/task-56) replaying real Inference results on both Flash-Lite models: no reply gave a number in 60; with the shipped wording the class split was described 6/6 on the plain prompt; it is weaker when the user asks for a percentage (1/6). Tests: chat.test.ts covers the paragraph's inclusion. Deferred to TASK-20: rewording 'which way it leans'.
<!-- SECTION:FINAL_SUMMARY:END -->
