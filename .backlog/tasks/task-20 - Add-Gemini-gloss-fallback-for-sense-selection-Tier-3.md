---
id: TASK-20
title: Add Gemini gloss fallback for sense selection (Tier 3)
status: To Do
assignee: []
created_date: '2026-09-20 10:04'
updated_date: '2026-09-22 10:37'
labels:
  - wsd
milestone: m-6
dependencies:
  - TASK-19
references:
  - docs/design/sense-selection.md
  - docs/contracts.md
project: inference
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tier 3 of docs/design/sense-selection.md's tiered pipeline: when TASK-19's scoring across Tiers 0-2 doesn't produce two distinct, confident candidate senses, prompt Gemini directly (via Genkit, already in the stack) for two plausible glosses of the candidate word in context. Must degrade gracefully -- a well-formed is_pun:false/sense_source:null response, never an unhandled error -- if this tier also fails. Per docs/design/sense-selection.md's open questions, the hand-off point between Sense Selection's lead and this tier's owner is explicitly unresolved; creating this as its own task makes that hand-off concrete.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When Tiers 0-2 produce no confident sense pair, Gemini is prompted for two plausible glosses of the candidate in context
- [ ] #2 sense_source is set to llm_fallback when this tier produces the winning senses
- [ ] #3 If Gemini also fails to produce two plausible glosses, /analyze still returns a well-formed response (is_pun: false, sense_source: null), never an unhandled error
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
