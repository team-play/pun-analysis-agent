---
id: TASK-23
title: 'Backend: user-facing messages for /api/chat model errors'
status: To Do
assignee: []
created_date: '2026-09-23 08:53'
labels: []
milestone: m-2
dependencies: []
references:
  - backend/src/routes/chat.ts
  - frontend/src/lib/chat/genkit-flow-stream.ts
  - docs/contracts.md
type: bug
project: backend
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When the Gemini call behind /api/chat fails, users see Gemini's raw developer-facing error. Found during TASK-8's live browser check: a Gemini free-tier 503 rendered in the chat's error box as 'UNAVAILABLE: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?alt=sse: [503 Service Unavailable] This model is currently experiencing high demand...'. The error box truncates to one line, so the only helpful sentence ('try again later') is cut off, while the internal API URL, provider and model name stay visible. The full upstream payload also sits in the error event's details, where anyone can see it in devtools.

Why it happens: routes/chat.ts runs failures through genkit/context's getCallableJSON. That function only genericizes errors that aren't GenkitErrors, and upstream model failures are GenkitErrors, so their message and details pass through unchanged. Scoped to Backend deliberately: Backend is the only domain that knows it's talking to Gemini, and Frontend consumes the /api/chat contract only (docs/design/frontend-design.md), so Frontend shouldn't learn Gemini's error vocabulary.

Context for whoever picks this up: (1) Frontend's genkit-flow-stream.ts renders errors as '${status}: ${message}', so the status code prefix will still show. Changing that is Frontend work and out of scope here. (2) backend/tests has a wire-format parity test against @genkit-ai/express's real handler for the error path; the event's shape must stay Genkit's, even if the test's expected message changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When the model call fails (at least Gemini 503 UNAVAILABLE, 429 RESOURCE_EXHAUSTED, and an invalid API key), the error event's message is a short user-facing sentence with no upstream URL, provider/model name, or raw upstream payload
- [ ] #2 The error event keeps Genkit's {error: {status, message}} wire shape and the original Genkit status code, with no upstream payload in details, so Frontend's adapter parsing needs no change
- [ ] #3 The full upstream error is still logged server-side for debugging
- [ ] #4 Backend tests cover the mapped messages for at least two failure statuses using the Genkit test-double model, with no live Gemini call
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code review (test coverage + human-readable code) done per AGENTS.md's Code review section
- [ ] #2 Architectural review done if this touches contracts.md, project-spec.md topology, or engineering-practices.md isolation/phase order, or adds a service/dependency/deploy target
- [ ] #3 Docs checked for drift (README.md, project-spec.md, local-setup.md, AGENTS.md); follow-up commit made if any changed
<!-- DOD:END -->
