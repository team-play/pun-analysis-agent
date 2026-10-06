---
id: TASK-68
title: >-
  Inference: pin the ONNX encoder revision and re-check the shipped detector on
  it
status: To Do
assignee:
  - '@yaitorr'
created_date: '2026-10-06 01:16'
updated_date: '2026-10-06 01:18'
labels:
  - pun-classifier
milestone: m-6
dependencies:
  - TASK-54
  - TASK-55
references:
  - inference/Dockerfile
  - inference/scoring.py
  - docs/experiments/task-55/README.md
  - inference/scripts/train_detector.py
  - docs/experiments/pun-detector/reproduction.md
priority: medium
project: inference
ordinal: 62000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
fastembed does not pin model revisions, so the inference image (and local runs and the trainer) load whatever `qdrant/all-MiniLM-L6-v2-onnx` export is newest when the model is first downloaded. That export has already changed under us: TASK-55 verified the shipped `detector.npz` weights against `8f518e88`, and upstream pushed `d1395466` on 2026-09-30 ("pad to batch-longest instead of fixed 128"). Production images built since then run `d1395466`. Two things suggest it is still fine: the Dockerfile's confidence check (baker sentence within 1e-4 of 0.94911) keeps passing, and TASK-54 found that retraining on `d1395466` reproduces every prototype-1 metric and all 605 test predictions. But no one has checked the shipped weights themselves on `d1395466`, and the next upstream change would reach production unreviewed. Retrained artifacts record the export they were trained on (`encoder_revision`, TASK-54); the shipped one records `8f518e88` in `encoder_history.runs_on`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The inference image always loads one pinned revision of the ONNX export; rebuilding after an upstream change does not change the model it runs
- [ ] #2 Local runs and scripts/train_detector.py resolve the same pinned revision as the image
- [ ] #3 The shipped detector.npz weights give the same predictions on the pinned revision as prototype-1 stored for the 605-item test split, with the comparison recorded under docs/experiments/
- [ ] #4 The revision the shipped artifact records matches the pinned one, and a test (no network) fails if they diverge
- [ ] #5 Inference image size and cold-start time do not grow measurably
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
