---
id: TASK-70
title: 'Inference image: download the embedding model in its own Docker stage'
status: To Do
assignee:
  - '@Andi-Cast'
created_date: '2026-10-06 01:36'
labels: []
dependencies:
  - TASK-39
  - TASK-68
priority: low
project: inference
ordinal: 63000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found while planning TASK-39 (2026-10-06): in inference/Dockerfile the build stage downloads the fastembed embedding model (all-MiniLM-L6-v2, ~87 MB) after `COPY pyproject.toml uv.lock` and `uv sync`, so any uv.lock change re-downloads it, and the rebuilt layer gets a new digest that Artifact Registry stores again (0.5 GB free tier shared with Backend). TASK-39 gave WordNet its own stage for the same reason; the model needs the same treatment. Trade-off: that stage needs its own fastembed install, whose version must match uv.lock's (fastembed decides which model files it downloads), so pin it and check it against the venv as TASK-39 does for wn.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A uv.lock-only change rebuilds the venv layer but reuses the embedding-model layer (same layer digest before and after)
- [ ] #2 The runtime still loads the baked-in model offline; the build-time checks (embedding dimension and the detector's pinned confidence) still pass
- [ ] #3 The model stage's fastembed version is checked against the one in inference/uv.lock, so a bump can't silently leave them mismatched
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
From TASK-39's measurement (2026-10-06, local BuildKit): once the runtime stage copies stable layers before the venv, a uv.lock-only change already keeps the embedding-model layer's digest the same (653b90f593e3 before and after), even though the build stage still re-downloads the model: COPY reuses its cached layer when the copied files are identical. So AC #1 already holds for a uv.lock-only change, but only because COPY matched on the files' contents: the build stage's fresh download has new modification times, so any change to an earlier runtime layer (a wn bump that changes the WordNet database, a Wiktionary refresh) still re-uploads the ~83 MB model, as TASK-39's review measured. A separate stage would keep that layer too, as /wn_data's does. This task also skips the re-download from HuggingFace on every dependency bump (build time, and a build that doesn't depend on HuggingFace being up).

Re-filed 2026-10-06 under a new ID: it was first filed as TASK-67 on TASK-39's branch, and TASK-67 was meanwhile taken on main. Depends on TASK-68 too: TASK-68 pins the ONNX export's revision in the same Dockerfile lines, so do this after it and pin that revision in the new stage.
<!-- SECTION:NOTES:END -->
