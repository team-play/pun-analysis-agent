---
id: TASK-66
title: >-
  Inference: train the pun detector on plain-text negatives so ordinary
  sentences stop scoring as puns
status: To Do
assignee:
  - '@Groverpr93'
created_date: '2026-10-06 01:00'
updated_date: '2026-10-06 01:01'
labels:
  - pun-classifier
dependencies:
  - TASK-54
references:
  - docs/experiments/pun-detector/prototype-1/README.md
  - eval/datasets/semeval2017_task7_puns.csv
  - eval/datasets/sentences_food.csv
  - eval/datasets/sentences_animal.csv
priority: high
type: bug
project: inference
ordinal: 61000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The prototype-1 detector (`inference/pun_detector/`, threshold 0.32) labels ordinary sentences as puns with high confidence. Found during TASK-56: "Please send me the report by Friday." scores P(pun) 0.99, "The meeting has been moved to Thursday afternoon." 1.00. Because the chatbot sends user text through `analyze_pun`, ordinary messages get explained as puns.

Measured on 2026-10-05 with `PunDetector().predict`:
- 40 hand-written everyday sentences: 35 flagged (87.5%), median P(pun) 0.97, 67.5% at P(pun) >= 0.9.
- The 495 non-pun rows of `eval/datasets/sentences_food.csv` and `sentences_animal.csv` (not used in training): 461 flagged (93.1%), median P(pun) 0.96, 65.5% at >= 0.9.
- For comparison, SemEval held-out non-puns: 68 of 173 flagged (39.3%).

Cause: training used only SemEval-2017 Task 7 rows (`splits.json` holds only `hom_*`/`het_*` IDs). SemEval's non-puns are proverbs and non-pun jokes, with no plain declarative text. On the held-out split the model rejects mostly proverbs and flags mostly jokes, so it learned "proverb vs anything else". Plain text falls on the pun side. Raising the threshold does not fix this, since about two thirds of plain sentences score >= 0.9. The same bias likely explains low scores on saying-shaped puns ("Every calendar's days are numbered." 0.13).

The food/animal non-puns (deferred in TASK-2.6) are one possible source of negatives, but they are domain-narrow and each sentence is built around a pun-prone word. Data used for training cannot also serve as the plain-text evaluation set. The prototype-1 README notes its test split has already been inspected, so recall must be checked on a held-out set nobody has looked at. Depends on TASK-54, because the training scripts are not in the repo yet.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A plain-text non-pun evaluation set (everyday sentences that are not proverbs and not in the training data) is committed under `eval/` with its provenance documented
- [ ] #2 The retrained detector flags at most 10% of that set as puns, and prototype-1's rate on the same set is reported alongside
- [ ] #3 Pun recall on a held-out set that has not been inspected stays within 3 percentage points of prototype-1's on the same set
- [ ] #4 Results are recorded as `docs/experiments/pun-detector/prototype-2/` in the style of prototype-1, and `detector.npz` and `model_version` are updated
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
