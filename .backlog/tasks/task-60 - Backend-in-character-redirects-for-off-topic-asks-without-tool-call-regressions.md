---
id: TASK-60
title: >-
  Backend: in-character redirects for off-topic asks, without tool-call
  regressions
status: To Do
assignee: []
created_date: '2026-10-04 00:16'
updated_date: '2026-10-04 20:25'
labels: []
dependencies:
  - TASK-61
references:
  - docs/experiments/task-31/README.md
  - backend/src/flows/system-instruction.ts
priority: low
type: enhancement
project: backend
ordinal: 56000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Otto's off-topic redirects are flat on main ('Analyzing and explaining puns is what I help with!'), which TASK-31.1's AC #4 wanted in character. A 2026-10-03 attempt showed a playful cue in PURPOSE's redirect sentence fixes the voice, but it made Gemini call analyze_pun on 'Give me 20 puns.' itself, and the ANALYZE_PUN_RULE sentence that stopped that made Otto decline example-pun requests. All edits were reverted. An ablation to tell cue from rule was cut short by free-tier quota; docs/experiments/task-31/README.md records every wording tried, the numbers, a design for resuming, and the untested hypothesis that the rule alone makes Otto redirect legitimate puns.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Off-topic requests are redirected back to puns in Otto's playful voice, without loosening TASK-12's scope rules (the AC moved here from TASK-31.1)
- [ ] #2 Measured side by side with main's instruction on the same pinned model, a batch request ('Give me 20 puns.') makes no more analyze_pun calls than on main
- [ ] #3 Measured the same way, single example-pun requests ('Tell me a pun about otters.', 'Write me a pun.', 'Tell me a pun.') get one shown, analyzed example as often as on main, and users' own puns phrased as commands or addressed to 'you' are still analyzed
- [ ] #4 Each experiment finishes within one day on gemini-3.5-flash-lite, pinned: its main baseline runs the same day, it follows AGENTS.md's Gemini quota rules (request estimate recorded before starting, at most half the model's requests/day including retries), and no conclusion pools runs from different days. Runs are recorded under docs/experiments/task-31/
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Budget sketch (2026-10-04, decided with Yai; revise when picking this up). The resume plan in docs/experiments/task-31/README.md (~190 replies, ~350 requests) would exceed half of a Flash-Lite model's 500 requests/day, and splitting it across days would break the same-day-baseline lesson. So the work is two one-day experiments, each planned to about 225 requests (250 minus a 10% reserve for retries). A shown or hidden example, or an analyzed pun, costs 2 requests; a decline, a redirect or a no-call reply costs 1.

Experiment 1, ablation (which edit makes Otto decline example requests): main, cue only, rule v2 only, cue + rule v2; the three example requests only; 8 runs per cell, interleaved. That is 96 replies, about 190 requests, and 24 example replies per variant, enough to separate 17/17 from 9/17 (round 6).

Experiment 2, candidate check (ACs #1-#3), on a later day once Experiment 1 has picked the wording: main vs the candidate; "Give me 20 puns." (AC #2), the three example requests and kitten + atoms (AC #3), France (AC #1 voice); 7 runs per cell. That is 98 replies, about 170 requests. If the candidate fails, a retry is a new one-day experiment with its own main baseline, not a continuation.

Pinned model: gemini-3.5-flash-lite, production's first rung, so results describe what users get (chosen over 3.1-flash-lite by Yai, accepting that it shares production's primary model's quota). Dropped on purpose: the second half of the TASK-31 hypothesis (that the rule alone makes Otto redirect users' own puns) is not ablated; Experiment 2 still checks users' puns for the chosen wording, which is what AC #3 needs.

Depends on TASK-61 so the pacer enforces the pin, the pace, the budget and the stop at the first 429.
<!-- SECTION:NOTES:END -->
