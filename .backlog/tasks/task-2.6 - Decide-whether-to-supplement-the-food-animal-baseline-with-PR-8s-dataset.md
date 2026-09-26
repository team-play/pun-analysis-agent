---
id: TASK-2.6
title: 'Decide whether to supplement the food/animal baseline with PR #8''s dataset'
status: Done
assignee: []
created_date: '2026-09-20 11:05'
updated_date: '2026-09-26 00:08'
labels:
  - dataset
milestone: m-6
dependencies:
  - TASK-2.5
references:
  - 'https://github.com/team-play/pun-analysis-agent/pull/15'
  - 'https://github.com/team-play/pun-analysis-agent/pull/8'
parent_task_id: TASK-2
project: eval
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-2.2 covers the food/animal rows already inside semeval2017_task7_puns.csv (its own category column). PR #8 (via TASK-2.5) adds a second, independent hand-authored food/animal dataset (500+500 rows) in a directly comparable schema, sitting alongside the SemEval subset rather than merged into it. The options were to supplement the SemEval-derived subset with it, drop it, or defer the call -- not replace it. Outcome: defer (see notes).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A decision is recorded as one of supplement, drop, or defer, with the reasoning behind it
- [ ] #2 If supplement: states how the two datasets are combined (e.g. concatenated as-is, deduped, reweighted) and which downstream tasks (TASK-16, TASK-2.3, TASK-2.4) consume the combined set
- [ ] #3 If drop: states what happens to PR #8 and eval/datasets/sentences_animal.csv / sentences_food.csv (e.g. PR closed, files removed, or kept unreferenced)
- [x] #4 If defer: states what the data does in the meantime (e.g. stays in the repo untouched) and what triggers revisiting the call
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Update 2026-09-25 (Livia and Prateek): the PR #8 data stays in the repo (eval/datasets/sentences_animal.csv, sentences_food.csv) but no action is taken on it for now -- neither folded in as supplementary data nor dropped. Revisit when animal work starts or class-balance/word-skew concerns become relevant.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Livia and Prateek chose to defer: PR #8's datasets (eval/datasets/sentences_animal.csv, sentences_food.csv) stay in the repo untouched, neither folded in nor dropped. Revisit when animal work starts or the class-balance and word-skew concerns become relevant. SemEval was assessed as fine for classification and remains the classifier's data source.
<!-- SECTION:FINAL_SUMMARY:END -->
