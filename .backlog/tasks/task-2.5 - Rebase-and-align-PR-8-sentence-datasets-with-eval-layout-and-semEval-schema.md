---
id: TASK-2.5
title: 'Rebase and align PR #8 sentence datasets with eval/ layout and semEval schema'
status: Done
assignee: []
created_date: '2026-09-20 11:04'
updated_date: '2026-09-26 00:08'
labels:
  - dataset
milestone: m-6
dependencies: []
references:
  - 'https://github.com/team-play/pun-analysis-agent/pull/15'
  - 'https://github.com/team-play/pun-analysis-agent/pull/8'
parent_task_id: TASK-2
project: eval
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
PR #8 (Livia's hand-authored animal/food sentence dataset, data/sentences_animal.csv and data/sentences_food.csv) was opened before #13 restructured eval data into eval/datasets/ and established the semeval2017_task7_puns.csv schema (id, is_pun, pun_type, source_corpus, category, text). Left as-is, #8 would land in a different directory with an incompatible, BOM-carrying schema, making it hard to compare against the SemEval-derived food/animal subset. This task covers only getting #8 into a directly comparable shape; whether to integrate it was tracked separately in TASK-2.6 (decided: defer).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 PR #8's original commit is rebased onto #13's tip with no row/content loss
- [x] #2 sentences_animal.csv and sentences_food.csv live under eval/datasets/, matching #13's layout
- [x] #3 UTF-8 BOM is removed from both files
- [x] #4 Columns are renamed/reordered to match semeval2017_task7_puns.csv's id, is_pun, pun_type, source_corpus, category, text shape, with the dataset's original word column preserved as a trailing pun_target column
- [x] #5 eval/README.md documents the new files' schema without misattributing them to an existing task
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Cherry-picked PR #8's commit onto #13's tip (no conflicts, disjoint paths). Wrote a scripted CSV transform (not manual edits) to move/rename/reshape both files, validated row-for-row against the originals before deleting them. Documented the result in eval/README.md, then corrected that doc after finding it had incorrectly implied TASK-2.2 already tracked this dataset. Opened PR #15 against #13's branch with the decision framed as supplement-or-drop, not replace.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verified with a round-trip script and independently re-derived in review: 500+500 rows preserved, every text/pun_target/pun_type/is_pun value matches the original files, ids unique and sequential, no BOM, pun_type empty exactly when is_pun is False. Delivered in PR #15, which touches only the two CSVs, eval/README.md and backlog task files.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rebased PR #8's commit onto #13's tip, moved both CSVs into eval/datasets/, stripped their BOM, and reshaped columns to match semeval2017_task7_puns.csv's schema (id, is_pun, pun_type, source_corpus, category, text) plus a trailing pun_target column. Documented the result in eval/README.md, catching and fixing an earlier doc draft that incorrectly implied TASK-2.2 already tracked this dataset. Opened PR #15 (https://github.com/team-play/pun-analysis-agent/pull/15) against #13's branch. This task covers only the mechanical rebase+alignment; the supplement-or-drop integration call is tracked separately.
<!-- SECTION:FINAL_SUMMARY:END -->
