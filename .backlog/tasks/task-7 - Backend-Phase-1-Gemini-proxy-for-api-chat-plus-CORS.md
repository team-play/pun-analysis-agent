---
id: TASK-7
title: 'Backend: Phase 1 Gemini proxy for /api/chat, plus CORS'
status: To Do
assignee: []
created_date: '2026-09-17 23:34'
updated_date: '2026-09-17 23:41'
due_date: '2026-09-21'
labels: []
milestone: m-2
dependencies: []
references:
  - docs/contracts.md
  - docs/engineering-practices.md
  - docs/local-setup.md
project: backend
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Per docs/engineering-practices.md's Phase 1 plan: /api/chat should forward the conversation straight to Gemini via Genkit's Google AI plugin and stream the reply back, with no analyze_pun tool yet. CORS middleware is required from this point on since Frontend (Firebase Hosting) and Backend (Cloud Run) are always cross-origin, in local dev per docs/local-setup.md's ports and in the deployed pairing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST /api/chat accepts {messages: [{role, content}]} per docs/contracts.md and streams Gemini's reply back in Genkit flow stream format
- [ ] #2 CORS middleware (e.g. hono/cors) is enabled so a browser-origin request from the Firebase-hosted frontend succeeds, both in local dev and against the deployed Cloud Run URL
- [ ] #3 No tool-calling logic exists yet — Gemini responds as a plain conversational proxy
- [ ] #4 Backend tests cover this flow using a Genkit test double for the model call, not a live Gemini request, per docs/engineering-practices.md's 'Backend in isolation' section
<!-- AC:END -->
