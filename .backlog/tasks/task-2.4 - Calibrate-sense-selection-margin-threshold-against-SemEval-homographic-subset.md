---
id: TASK-2.4
title: Calibrate sense-selection margin threshold against SemEval homographic subset
status: Done
assignee: []
created_date: '2026-09-20 10:05'
updated_date: '2026-10-02 23:33'
labels:
  - wsd
  - evaluation
milestone: m-6
dependencies:
  - TASK-1
  - TASK-19
references:
  - docs/design/sense-selection.md
parent_task_id: TASK-2
project: eval
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
docs/design/sense-selection.md leaves the Tier 1 margin threshold (when two candidate senses count as close enough to signal a pun) unset until Eval runs it against real data. Use the eval dataset's homographic, is_pun:true rows to calibrate that threshold once TASK-19's scoring exists.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Margin threshold is calibrated against the homographic/is_pun:true subset of the eval dataset
- [x] #2 The chosen threshold and calibration methodology are recorded in docs/design/sense-selection.md's open questions section
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [x] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Build inference/scripts/calibrate_margin.py: for each row in eval/datasets/semeval2017_task7_puns.csv, run extract_candidates -> local_contexts -> senses -> score_senses/pun_margin, keep embedding_lesk-method signals only.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
From TASK-19 (2026-09-28): two placeholders in inference/scoring.py need calibrating, MARGIN_THRESHOLD (0.1) and GLOSS_DISTINCT_THRESHOLD (0.5, used when lexfiles can't separate senses: Wiktionary senses and adj.all adjectives). With 0.1, polysemous verbs scored by Lesk showed margins of 0.02-0.08 in the code review's samples (need, use, lose, die, go, stand), so they'd all read as puns; the threshold likely needs to be much lower or margin-relative. /analyze doesn't expose the margin, and inference/ and eval/ are separate uv projects, so calibration needs a way to get margins out (e.g. a script in inference/ that runs the SemEval subset, or a debug field).

From TASK-19's review (Yai, 2026-09-29): Lesk margins shrink as a word gains senses. Sentence-vs-gloss cosines bunch in a narrow band, and the runner-up is the best of every other-category sense. Real model, no seeded slot, ordinary non-pun sentences: window ("She opened the window to let in air.") 8 senses, margin 0.043; book ("He read the book on the train.") 10, 0.083; bank ("We had a picnic on the river bank.") 10, 0.041; tire ("Long meetings tire me out.") 4, 0.046. All four read as puns at 0.1. table/chair/interest (6/5/7 senses) 0.18/0.25/0.36 and dough ("She rolled the dough flat.", 2 senses) 0.43 did not. TASK-21 planning saw the same: "She rolled the dough flat." gave rolled 0.014 and flat 0.023. Calibration should check whether the margin needs to account for the number of senses. MARGIN_THRESHOLD only affects embedding-Lesk: selectional-preference scores are 0 or 1, so their margins are too. Calibrate on signals with PunSignal.method == "embedding_lesk".

Built inference/scripts/calibrate_margin.py: runs the full eval dataset through candidates->context->senses->scoring, collecting embedding_lesk-only margins. Negative set (3,752 candidate-level observations on is_pun:false rows) and positive set (1,602/1,607 homographic is_pun:true sentences, min margin per sentence). Sense-count normalization (margin*sense_count) tested via Pearson correlation (-0.228 negative, -0.080 positive -- too weak to be the dominant driver) and a normalized threshold sweep (worse fp_rate at matched recall than flat); rejected in favor of a flat threshold. User chose 0.03 (71.4% recall / 25.8% fp_rate) over the alternatives (0.02: 56.2%/18.2%; 0.05: 85.3%/38.9%) given Tier 3's llm_fallback is a graceful degradation, not an error -- a miss is cheaper than a confident misattribution. Code review (subagent) caught two issues, both fixed: (1) scoring.py had a leftover pre-calibration header comment implying GLOSS_DISTINCT_THRESHOLD was also calibrated (it wasn't, left at 0.5, explicitly marked 'Not yet calibrated'). (2) recall figures didn't disclose that 5/1,607 homographic rows had no eligible embedding-Lesk candidate and were excluded from the denominator -- added the coverage figure and the ~71.2% adjusted recall if counted as misses, to both scoring.py's comment and sense-selection.md. Added test_margin_threshold_is_the_task_2_4_calibrated_value as a regression guard. 54/54 inference tests pass, ruff check and ruff format clean.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Calibrated inference/scoring.py's MARGIN_THRESHOLD from the 0.1 placeholder to 0.03, via a new inference/scripts/calibrate_margin.py that measures recall on the SemEval eval dataset's homographic is_pun:true rows against a false-positive proxy on is_pun:false rows. Sense-count normalization was tested and explicitly rejected (weak correlation, worse fp_rate at matched recall). Methodology and chosen value recorded in docs/design/sense-selection.md's open questions (AC #2). Verified via uv run pytest (54/54 pass) and uv run ruff check/format. Code review (subagent) caught a stale comment and an undisclosed coverage caveat in the recall figures; both fixed. Architectural review not needed (no contracts/topology/isolation change).
<!-- SECTION:FINAL_SUMMARY:END -->
