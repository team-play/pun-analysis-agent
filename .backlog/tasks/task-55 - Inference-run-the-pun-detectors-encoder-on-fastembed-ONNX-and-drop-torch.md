---
id: TASK-55
title: 'Inference: run the pun detector''s encoder on fastembed ONNX and drop torch'
status: To Do
assignee:
  - '@yaisiel.torres'
created_date: '2026-10-02 10:04'
labels:
  - pun-classifier
milestone: m-4
dependencies:
  - TASK-16
references:
  - inference/pun_detector/features.py
  - inference/scoring.py
  - docs/experiments/pun-detector/prototype-1/report.json
project: inference
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
PR 85 runs all-MiniLM-L6-v2 twice in Inference: through sentence-transformers on torch for the detector, and through fastembed's ONNX export for sense selection (`scoring.default_embed`). torch, transformers and sentence-transformers grow the image, likely past Artifact Registry's 0.5 GB free tier with 3 kept versions (docs/local-setup.md), and pushed Cloud Run memory to 2 GiB. The detector feeds the raw 384-d sentence embedding into its trained classification head (`feature_vector` in pun_detector/features.py), so swapping encoders must be shown not to change predictions; the thresholds below were fixed on 2026-10-02, before running the comparison, so they cannot drift toward whatever passes. Comparing on the test split is not test-set tuning: nothing is chosen from it. Decided 2026-10-02: this blocks merging PR 85. If the gates fail, record the comparison and hand retraining to TASK-54 rather than loosening the thresholds. Following docs/local-setup.md today leaves the detector unable to load (the encoder download is only in inference/README.md, with a different WN_DATA_DIR and port), and that download step changes with this swap.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The detector and its sense selection embed with the same fastembed ONNX model scoring.py uses, and torch, transformers and sentence-transformers are gone from inference/pyproject.toml and uv.lock
- [ ] #2 On the 605-item test split, ONNX and torch 3-class predictions differ on at most 1 item, and only where P(pun) is within 0.01 of the threshold or the top two classes are within 0.01 of each other
- [ ] #3 Metrics recomputed from the ONNX predictions are within 0.005 of report.json, with embedding cosine similarity and the largest class-probability difference recorded alongside
- [ ] #4 detector.npz's feature metadata names the new encoder, so `PunDetector`'s configuration check still rejects a mismatched artifact
- [ ] #5 The image size and Cloud Run memory use are measured; `--memory` in deploy-inference.yml is set from the measurement and docs/local-setup.md's registry note is updated
- [ ] #6 docs/local-setup.md's Inference section covers every one-time download the detector needs, and inference/README.md no longer carries its own local-setup steps
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
