---
id: TASK-74
title: >-
  Local setup: guide contributors through creating their own Gemini project and
  binding its key
status: To Do
assignee: []
created_date: '2026-10-07 10:47'
labels: []
dependencies: []
references:
  - backend/.env.example
  - backend/src/genkit.ts
  - backend/src/config.ts
  - .claude/skills/setup-local-env/SKILL.md
  - docs/local-setup.md
  - AGENTS.md
priority: medium
type: enhancement
project: backend
ordinal: 67000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Contributors should be able to run the app locally against their own Gemini project instead of the team's. Today `docs/local-setup.md` tells them to create keys in the team's AI Studio project (`gen-lang-client-0125403786`). Free-tier limits are per project, not per key, so every local run spends production's quota; TASK-45 and TASK-31 used it up this way. Nothing in Backend ties it to that project: `googleAI()` in `backend/src/genkit.ts` just reads `GEMINI_API_KEY`, so a key from any project works.

Most of the team hasn't used Google Cloud or AI Studio before. The confusing parts are a project with no billing (so it stays on the free tier), the AI Studio project versus the similarly named GCP project, and pinning a Flash-Lite model. A Claude Code skill walks them through those console steps. A script does the actual binding, so it also works for teammates on other agents, and the key never passes through an agent's transcript: the person types it into the script's hidden prompt, never into chat. The existing setup-local-env skill currently says API keys are handled by the maintainer.

Companion task: TASK-73 (frontend App Check skip). Together they cover a fully local run. TASK-37 (billing on the team project) is unrelated to personal projects.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A setup command reads the Gemini key from a hidden prompt (never argv, never echoed) and writes `GEMINI_API_KEY` to `backend/.env.local`, keeping any other settings already in that file
- [ ] #2 The setup command pins `GEMINI_MODEL` to a Flash-Lite model from `GEMINI_MODEL_LADDER` unless one is already set
- [ ] #3 The setup command checks the key with a call that spends no generation quota (verify that it doesn't) and fails with a clear message for an invalid key; tests cover the file writing and the invalid-key path without calling Gemini
- [ ] #4 A Claude Code skill walks a contributor with no Google Cloud experience through creating a personal AI Studio project without billing and a key restricted to the Gemini API, then has them run the setup command; the skill never asks for the key in chat
- [ ] #5 The setup-local-env skill points to the new skill instead of saying keys are handled by the maintainer
- [ ] #6 `docs/local-setup.md` makes a personal project the default for local work, with a warning that a project with billing turned on gets charged past the free tier; AGENTS.md's Gemini quota section says its shared-quota rules apply to the team project and production, not to personal projects
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
