---
id: TASK-39
title: 'Inference image: download WordNet in its own Docker stage'
status: In Progress
assignee:
  - '@Andi-Cast'
created_date: '2026-09-28 09:46'
updated_date: '2026-10-06 01:36'
labels: []
dependencies:
  - TASK-14
references:
  - inference/Dockerfile
  - docs/local-setup.md
priority: low
type: chore
project: inference
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In inference/Dockerfile (TASK-14), `wn download oewn:2025` runs in the build stage after `COPY pyproject.toml uv.lock` and `uv sync`. Any uv.lock change (or a GitHub Actions cache miss) therefore rebuilds the ~97 MB WordNet layer along with the ~360 MB venv, and each rebuilt layer gets a new digest that Artifact Registry stores again. With the image at ~219 MB compressed and the shared repo already holding ~143 MB of Backend images (0.5 GB free tier), two such rebuilds kept by the cleanup policy can exceed the free tier. Moving the download into its own stage that does not depend on uv.lock (as the Wiktionary download already does) keeps that layer stable across dependency bumps. Trade-off to settle: that stage needs its own `wn` install, whose version can drift from the one locked in uv.lock; the WordNet database schema has to match the runtime `wn`. Deferred out of TASK-14 by Yai (2026-09-28).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A uv.lock-only change rebuilds the venv layer but reuses the WordNet data layer (same layer digest before and after)
- [x] #2 The runtime `wn` reads the separately downloaded WordNet data; the image build fails if it cannot (the build-time data check added in TASK-14 still passes)
- [x] #3 Whatever pins the WordNet stage's `wn` version is tied to, or checked against, the version in inference/uv.lock, so a `wn` bump cannot silently leave them mismatched
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [x] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [x] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. inference/Dockerfile: new `wordnet` stage (python:3.12-slim, pip install wn==${WN_VERSION}, wn download oewn:2025 into /wn_data), not depending on uv.lock. 2. Global ARG WN_VERSION; after uv sync the build stage checks the venv's wn version equals it and fails the build with a message saying what to update (AC #3). 3. Runtime stage copies stable layers first (WordNet, Wiktionary), then the embedding model, venv and app, so a venv change can't invalidate the WordNet layer. 4. Verify AC #1 locally: build a scratch copy of the build context, add only a comment to its uv.lock, rebuild, and compare the final image's layer digests, before and after the change. AC #2: the existing build-time WordNet check still passes. AC #3: a WN_VERSION that differs from uv.lock fails the build. Out of scope: the embedding model has the same problem (follow-up task).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented (2026-10-06): inference/Dockerfile gets a `wordnet` stage (python:3.12-slim, pip install wn==${WN_VERSION}, wn download oewn:2025 into /wn_data) that never sees uv.lock. A global ARG WN_VERSION=1.1.1 pins it, and after uv sync the build stage compares the venv's wn with WN_VERSION and fails the build with "uv.lock installs wn X but WN_VERSION is Y: set WN_VERSION at the top of this Dockerfile to match" (AC #3; checked with --build-arg WN_VERSION=1.0.0, and the default passes). The runtime stage copies the least likely to change first: Wiktionary (pinned by checksum), WordNet, the embedding model, then the venv and the app. Once one step's cache misses, every later step reruns, and the old order re-copied every data layer after the venv.

Measured locally (BuildKit, Docker 28.4.0, arm64), building a scratch copy of the build context twice with only a comment appended to uv.lock and comparing the final image's layer digests. Old Dockerfile: the venv (144 MB compressed), WordNet (35.6 MB), embedding model (83 MB) and Wiktionary (28.9 MB) layers all got new digests, ~292 MB to store again. New Dockerfile: only the venv and the app/check layers changed; WordNet (0d6d1fc914ce), Wiktionary and the model kept their digests (AC #1). A simulated wn-stage rerun kept Wiktionary's digest. Both build-time checks (WordNet/Wiktionary/embedding lookups as the app user, and the detector's pinned confidence) pass on the new layout (AC #2); the review also ran the image as `app` and found oewn:2025 read from /wn_data with a schema the venv's wn 1.1.1 accepts.

Caveat: in CI the saving holds while the GitHub Actions cache still has main's last build (an entry is dropped after 7 days unused, or when the repo's caches pass 10 GB, shared with Backend) and python:3.12-slim hasn't changed upstream; otherwise every layer is rebuilt. The base image stays unpinned on purpose, so it keeps getting security updates. docs/local-setup.md updated: the registry size note, the Docker repo row, and the WN_VERSION rule ("when you bump wn in uv.lock, update WN_VERSION too").

Review (AGENTS.md, independent subagent): no blockers. Fixed: the stale local-setup.md lines and the missing WN_VERSION rule, the CI caveats, Wiktionary copied before WordNet (a wn bump would otherwise re-upload Wiktionary's 29 MB), and two comments. Architectural review: no contract or topology change, no new service or deploy target; CI builds the same Dockerfile with no target or build args. TASK-70 filed for the embedding model, which is still re-downloaded in the build stage.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
WordNet is now downloaded in its own `wordnet` stage of inference/Dockerfile, pinned by WN_VERSION, which the build checks against uv.lock's wn (a mismatch fails the build with a message saying what to update). The runtime stage copies data layers before the venv. Measured locally, a uv.lock-only change re-uploads only the venv (~144 MB compressed) instead of ~292 MB, with the WordNet, Wiktionary and embedding-model layers keeping their digests, while the CI cache holds main's last build and the base image is unchanged. Both build-time checks pass, and docs/local-setup.md explains the new layout and the WN_VERSION rule. TASK-70 covers moving the embedding model out of the build stage too.
<!-- SECTION:FINAL_SUMMARY:END -->
