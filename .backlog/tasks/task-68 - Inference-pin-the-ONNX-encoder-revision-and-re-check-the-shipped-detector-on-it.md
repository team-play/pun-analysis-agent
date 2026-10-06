---
id: TASK-68
title: >-
  Inference: pin the ONNX encoder revision and re-check the shipped detector on
  it
status: In Progress
assignee:
  - '@yaitorr'
created_date: '2026-10-06 01:16'
updated_date: '2026-10-06 02:13'
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
- [x] #1 The inference image always loads one pinned revision of the ONNX export; rebuilding after an upstream change does not change the model it runs
- [x] #2 Local runs and scripts/train_detector.py resolve the same pinned revision as the image
- [x] #3 The shipped detector.npz weights give the same predictions on the pinned revision as prototype-1 stored for the 605-item test split, with the comparison recorded under docs/experiments/
- [x] #4 The revision the shipped artifact records matches the pinned one, and a test (no network) fails if they diverge
- [x] #5 Inference image size and cold-start time do not grow measurably
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [x] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [x] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Pin qdrant/all-MiniLM-L6-v2-onnx@d13954661f83248295ba75c1ed411eef3b7b936e (decided with user: production already runs it, TASK-54 reproduced on it, upstream's fixed tokenizer). Only tokenizer.json's padding differs from 8f518e88, and fastembed 0.8.1 overrides padding to batch-longest anyway.
2. scoring.py: EMBEDDING_SOURCE + EMBEDDING_REVISION; default_embed fetches the pinned snapshot with huggingface_hub.snapshot_download and loads it via TextEmbedding(specific_model_path=...), since fastembed can't take a revision. Local runs and train_detector go through it.
3. Dockerfile: download the same revision at build time; the offline runtime check fails the build if it disagrees with scoring.py.
4. train_detector.encoder_revision() returns the pin instead of reading fastembed internals.
5. docs/experiments/task-68: run shipped detector.npz on the pinned revision against prototype-1's 605 stored test predictions; record results.
6. Retag detector.npz metadata only (encoder_revision + encoder_history), arrays byte-identical; no-network test asserts artifact revision == scoring.EMBEDDING_REVISION.
7. Measure image size and cold start before/after.
8. Code review + architectural review subagents; docs drift check.

Revision after review: step 4 deletes train_detector.encoder_revision() (the trainer records scoring.EMBEDDING_REVISION). Added EMBEDDING_FILES, tests tying Dockerfile/fastembed source/full-hash to the pin, and HF_HUB_DISABLE_PROGRESS_BARS in the runtime image.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Pinned qdrant/all-MiniLM-L6-v2-onnx@d1395466 in scoring.py (snapshot_download + fastembed specific_model_path); Dockerfile bakes it with hf download --revision; image's offline check fails the build on a mismatch (verified by building with 8f518e88 in the Dockerfile only). docs/experiments/task-68: shipped weights reproduce 605/605 stored predictions on the pin; diagnostic vs 8f518e88 has max class-probability gap 0.0 (fastembed 0.8.1 overrides tokenizer padding, the only file that changed). detector.npz retagged (metadata only, arrays byte-identical): encoder_revision added, runs_on removed. Image 350,913,628 -> 350,913,264 B; ready 2.6-3.0 s -> 2.6-2.8 s; first reply unchanged. 159 tests pass; both new tests mutation-checked.

Validation: 161 pytest pass (no network), ruff + biome + mermaid clean. AC1: Dockerfile bakes d1395466 by full hash with hf download; runtime HF_HUB_OFFLINE; build with 8f518e88 in Dockerfile only fails (OfflineModeIsEnabled); test_dockerfile_bakes_the_pinned_export. AC2: default_embed/trainer/compare.py all resolve scoring.EMBEDDING_REVISION; compare.py loaded d1395466. AC3: docs/experiments/task-68/results.json 605/605. AC4: test_artifact_was_checked_on_the_pinned_encoder_revision, mutation-checked. AC5: image 350,913,628 -> 350,913,534 B; ready 2.6-3.0 -> 2.6-2.8 s; first reply 0.13-0.16 -> 0.13-0.15 s. Code review + architectural review subagents: no serious defects; fixed allow_patterns test gap, test comment reason, README byte breakdown and failure wording, cold-start progress-bar log noise (HF_HUB_DISABLE_PROGRESS_BARS=1), documented Hugging Face as the only model source now. Doc drift fixed in reproduction.md, local-setup.md, task-55 README (to go in a separate docs commit).
<!-- SECTION:NOTES:END -->
