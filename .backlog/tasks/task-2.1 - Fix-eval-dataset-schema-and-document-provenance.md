---
id: TASK-2.1
title: Fix eval dataset schema and document provenance
status: Done
assignee: [Livia]
created_date: '2026-09-20 10:04'
updated_date: '2026-09-20 10:15'
labels:
  - dataset
milestone: m-6
dependencies: []
references:
  - docs/contracts.md
parent_task_id: TASK-2
project: eval
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The SemEval-2017 Task 7 ingestion (eval/datasets/pun_detection_dataset.csv, added in PR #9) conflates two different things under pun_type: for is_pun:true rows it's a real semantic label, but for is_pun:false rows it just carries over which of SemEval's two source corpora (homographic-pun or heterographic-pun) the row was drawn from -- SemEval's own corpora bundle punning and non-punning text together for Subtask 1 detection, so the negative examples have no actual pun mechanism to type. This collides with docs/contracts.md's implied null-when-not-applicable convention for pun_type (mirroring the documented sense_source null case) and with the generic pun_detection_dataset.csv filename, which doesn't signal the file is an unmodified SemEval ingestion rather than a project-curated set.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dataset file is renamed to reflect its SemEval-2017 Task 7 source
- [x] #2 A source_corpus column carries SemEval's original homographic/heterographic label on every row
- [x] #3 pun_type is null whenever is_pun is False
- [x] #4 eval/README.md documents the dataset's columns, provenance/license, and the pun_type-vs-source_corpus distinction
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. git mv eval/datasets/pun_detection_dataset.csv to eval/datasets/semeval2017_task7_puns.csv
2. Add a source_corpus column derived from the id prefix (het_ -> heterographic, hom_ -> homographic), preserving SemEval's own terms verbatim
3. Set pun_type to null (empty) on every row where is_pun is False
4. Write eval/README.md documenting columns, SemEval provenance/license, and the pun_type (project vocabulary, null when not a pun) vs source_corpus (SemEval's own vocabulary, always present) distinction
5. Verify row counts and null/non-null pun_type split match expectations before finalizing
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verified via a rewrite script: 4030 rows preserved, 0 rows with pun_type set while is_pun=False, 0 rows with pun_type empty while is_pun=True, 0 mismatches between source_corpus and the id's het_/hom_ prefix (2250 homographic, 1780 heterographic, matching PR #9's own validation counts).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Renamed eval/datasets/pun_detection_dataset.csv to semeval2017_task7_puns.csv; added a source_corpus column carrying SemEval's original homographic/heterographic corpus label on every row; nulled pun_type on all is_pun:False rows so it matches docs/contracts.md's null-when-not-applicable convention; documented the schema, provenance, and the pun_type-vs-source_corpus distinction in eval/README.md. Verified with a validation pass over all 4030 rows (see implementation notes).
<!-- SECTION:FINAL_SUMMARY:END -->
