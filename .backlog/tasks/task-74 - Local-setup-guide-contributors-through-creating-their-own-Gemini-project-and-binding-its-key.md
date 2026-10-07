---
id: TASK-74
title: >-
  Local setup: guide contributors through creating their own Gemini project and
  binding its key
status: In Progress
assignee:
  - '@yaitorr'
created_date: '2026-10-07 10:47'
updated_date: '2026-10-07 11:29'
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
- [x] #1 A setup command reads the Gemini key from a hidden prompt (never argv, never echoed) and writes `GEMINI_API_KEY` to `backend/.env.local`, keeping any other settings already in that file
- [x] #2 The setup command pins `GEMINI_MODEL` to a Flash-Lite model from `GEMINI_MODEL_LADDER` unless one is already set
- [ ] #3 The setup command checks the key with a call that spends no generation quota (verify that it doesn't) and fails with a clear message for an invalid key; tests cover the file writing and the invalid-key path without calling Gemini
- [x] #4 A Claude Code skill walks a contributor with no Google Cloud experience through creating a personal AI Studio project without billing and a key restricted to the Gemini API, then has them run the setup command; the skill never asks for the key in chat
- [x] #5 The setup-local-env skill points to the new skill instead of saying keys are handled by the maintainer
- [x] #6 `docs/local-setup.md` makes a personal project the default for local work, with a warning that a project with billing turned on gets charged past the free tier; AGENTS.md's Gemini quota section says its shared-quota rules apply to the team project and production, not to personal projects
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [x] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [x] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Script backend/scripts/setup-gemini-key.ts (pnpm --filter backend run setup:gemini): hidden raw-mode prompt or pipe; validate with models.get (no generate request), key in x-goog-api-key header; write backend/.env.local atomically, owner-only, keeping other lines; pin GEMINI_MODEL to the ladder's first Flash-Lite unless set. Read existing values with util.parseEnv to match --env-file.
2. node:test tests with injected fetch and temp dirs; fake TTY for the prompt.
3. Skill .claude/skills/gemini-personal-project; setup-local-env points to it.
4. Docs: local-setup.md Secrets + Backend quick start, AGENTS.md Gemini quota; follow-up commit for agent-setup.md and backend/.env.example.
5. Empirical check with a real personal key that models.get spends no quota and works with an AQ. authorization key.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Google's responses to malformed keys (curl): standard key -> 400 INVALID_ARGUMENT, reason API_KEY_INVALID; AQ. authorization key -> 401 UNAUTHENTICATED. Since May 2026 AI Studio creates authorization keys by default, so the script never checks an AIza prefix.

Quota evidence so far (docs only): limits are per project; the free-tier quota metric is generate_content_free_tier_requests with IDs GenerateRequestsPer{Day,Minute}PerProjectPerModel-FreeTier, i.e. generate calls. models.get is not one. Still to do with a real personal key: ~30 models.get in a minute (above Flash-Lite's 15 RPM) with no 429, then the project's usage page shows no requests; and confirm an AQ. key may call models.get at all. Until then docs say "reads the model's metadata, not generating anything", not "spends no quota".

Manual runs: under a real pty (script) with input after the prompt, the key never appears in output; bogus keys piped and typed fail clearly and create no .env.local.

Code review fixes: shell-exported GEMINI_API_KEY/GEMINI_MODEL beat --env-file, so the script warns and docs say so; values read with util.parseEnv (quotes, inline comments, CRLF, last-wins, later empty GEMINI_MODEL=); atomic owner-only write via temp file + rename; import.meta.main replaced (needs Node 24.2, engines allows 24); Ctrl-D and EOF cancel; 400 blames the key only for API_KEY_INVALID; tests added for every surviving mutation. Not done: scripts/ and tests/ aren't type-checked in CI (Backend tsconfig covers src/ only; pre-existing for tests); a one-off tsc over them passes.
<!-- SECTION:NOTES:END -->
