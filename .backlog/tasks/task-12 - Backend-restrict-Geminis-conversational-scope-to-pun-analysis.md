---
id: TASK-12
title: 'Backend: restrict Gemini''s conversational scope to pun analysis'
status: To Do
assignee: []
created_date: '2026-09-17 23:34'
updated_date: '2026-09-17 23:41'
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
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A system instruction/persona constrains Gemini's replies to pun analysis and directly related conversation
- [ ] #2 An off-topic user message (e.g. general small talk unrelated to puns) gets redirected toward pun analysis rather than an open-ended general-purpose answer
- [ ] #3 On-topic pun requests still flow through analyze_pun exactly as before — the restriction doesn't change tool-calling behavior
- [ ] #4 Behavior is covered by a Backend test asserting the system instruction is present/applied, run against a Genkit test double per docs/engineering-practices.md's isolation rule
<!-- AC:END -->
