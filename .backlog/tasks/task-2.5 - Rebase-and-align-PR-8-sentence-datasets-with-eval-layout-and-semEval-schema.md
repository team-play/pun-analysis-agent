---
id: TASK-2.5
title: 'Rebase and align PR #8 sentence datasets with eval/ layout and semEval schema'
status: Done
assignee: []
created_date: '2026-09-20 11:04'
updated_date: '2026-09-20 11:05'
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
PR #8 (Livia's hand-authored animal/food sentence dataset, data/sentences_animal.csv and data/sentences_food.csv) was opened before #13 restructured eval data into eval/datasets/ and established the semeval2017_task7_puns.csv schema (id, is_pun, pun_type, source_corpus, category, text). Left as-is, #8 would land in a different directory with an incompatible, BOM-carrying schema, making it hard to compare against the SemEval-derived food/animal subset. This task tracks getting #8 into a directly comparable shape so Livia and Prateek can evaluate it — it does NOT cover the actual supplement-or-drop integration decision, which stays open and untracked.
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
Verified via a round-trip script: 500+500 rows preserved in both files, every text/pun_target/pun_type/is_pun value matches the pre-transform CSVs exactly, BOM confirmed absent from both output files (checked first 3 bytes). PR #15 diff against #13's tip is exactly the 3 expected files (eval/README.md + 2 CSVs), confirmed with git diff --stat after two upstream force-pushes to #13's branch required re-rebasing. CI on PR #15: 5/5 checks green; mergeStateStatus is BLOCKED only on required review (reviewDecision: REVIEW_REQUIRED), not on any failing check.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rebased PR #8's commit onto #13's tip, moved both CSVs into eval/datasets/, stripped their BOM, and reshaped columns to match semeval2017_task7_puns.csv's schema (id, is_pun, pun_type, source_corpus, category, text) plus a trailing pun_target column. Documented the result in eval/README.md, catching and fixing an earlier doc draft that incorrectly implied TASK-2.2 already tracked this dataset. Opened PR #15 (https://github.com/team-play/pun-analysis-agent/pull/15) against #13's branch. This task covers only the mechanical rebase+alignment; the supplement-or-drop integration call is tracked separately.
<!-- SECTION:FINAL_SUMMARY:END -->
