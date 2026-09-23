---
id: TASK-12
title: 'Backend: restrict Gemini''s conversational scope to pun analysis'
status: To Do
assignee: []
created_date: '2026-09-17 23:34'
updated_date: '2026-09-23 10:30'
due_date: '2026-09-21'
labels: []
milestone: m-5
dependencies:
  - TASK-9
references:
  - docs/project-spec.md
  - docs/engineering-practices.md
project: backend
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Transitional slice ahead of full evaluation: today's Phase 1/2 proxy lets Gemini chat about anything. Per docs/project-spec.md's Data/Eval goal of running a subset through the full pipeline to evaluate explanation quality, the conversational surface needs to behave as a focused pun-analysis agent rather than a general-purpose chatbot, so eval runs aren't muddied by off-topic replies. Applies via Genkit's system instruction on the flow, independent of whether analyze_pun is backed by TASK-9's fixture or TASK-11's real Inference.

Since the 2026-09-23 Tier 3 redesign, this task owns the system instruction's structure and persona, including the rule that Gemini consults Inference through analyze_pun for each new phrase to analyze. That rule is an instruction only, not Genkit's toolChoice: "required", so follow-ups ("explain that again") can be answered from the conversation so far without another Inference call (AGENTS.md: don't multiply Cloud Run invocations). Note the /api/chat request carries only message text, so earlier tool outputs aren't resent; follow-ups rely on what Gemini already wrote. TASK-20 owns the instruction's llm_fallback paragraph.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A system instruction/persona constrains Gemini's replies to pun analysis and directly related conversation
- [ ] #2 An off-topic user message (e.g. general small talk unrelated to puns) gets redirected toward pun analysis rather than an open-ended general-purpose answer
- [ ] #3 Behavior is covered by a Backend test asserting the system instruction is present/applied, run against a Genkit test double per docs/engineering-practices.md's isolation rule
- [ ] #4 The system instruction tells Gemini to consult Inference through analyze_pun for every new phrase the user wants analyzed, by instruction only (no forced toolChoice); follow-up questions may be answered from the conversation so far
- [ ] #5 Client-sent system-role messages are dropped (or rejected) so Backend's instruction is the only system instruction Gemini receives
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
