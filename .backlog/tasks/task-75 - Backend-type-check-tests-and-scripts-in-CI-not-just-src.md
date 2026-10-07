---
id: TASK-75
title: 'Backend: type-check tests and scripts in CI, not just src'
status: In Progress
assignee:
  - '@yaitorr'
created_date: '2026-10-07 13:07'
labels:
  - backend
  - tooling
  - ci
dependencies: []
priority: medium
ordinal: 68000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
backend/tsconfig.json includes only src/ (rootDir src, so dist/ holds only the server), so `pnpm --filter backend run build` never type-checks backend/tests/ or backend/scripts/. Node 24 runs those files by stripping types without checking them, so type errors there only surface by accident: during TASK-74 a one-off check with a throwaway config caught a real error in backend/scripts/setup-gemini-key.ts. TASK-26 made erasableSyntaxOnly fail "at typecheck rather than at runtime", but nothing type-checked tests at all.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A committed no-emit type check covers backend/src, backend/tests and backend/scripts, run by `pnpm --filter backend run typecheck`
- [ ] #2 CI (test.yml, through the reusable test-js.yml) fails a pull request whose backend tests or scripts have a type error
- [ ] #3 Existing type errors in backend tests are fixed, and the backend tests still pass
- [ ] #4 The production build output is unchanged: dist/ still contains only the compiled src/
- [ ] #5 docs/local-setup.md and docs/engineering-practices.md describe the new check
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add backend/tsconfig.check.json extending tsconfig.json (noEmit, rootDir ".", allowImportingTsExtensions; include src, tests, scripts) and a `typecheck` script.
2. Fix the type errors it reports in tests; raise lib to ES2024 to match the Node 24 runtime (tests use Promise.withResolvers). lib only changes available type declarations, not emit.
3. Add a `typecheck` input (default false) to test-js.yml, mirroring `build`; test.yml enables it for backend. Deploy gates unchanged.
4. Verify: injected type error fails the check; dist/ checksums identical to main; tests + Biome + actionlint pass; TASK-74 scripts pass the check.
5. Subagent code review; docs-drift check of local-setup.md "Lint / test / format everywhere".
<!-- SECTION:PLAN:END -->
