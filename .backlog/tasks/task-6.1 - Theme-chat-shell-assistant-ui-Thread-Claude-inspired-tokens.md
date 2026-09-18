---
id: TASK-6.1
title: 'Theme & chat shell (assistant-ui Thread, Claude-inspired tokens)'
status: To Do
assignee: []
created_date: '2026-09-17 23:33'
updated_date: '2026-09-17 23:41'
due_date: '2026-09-21'
labels: []
milestone: m-1
dependencies: []
references:
  - docs/design/frontend-design.md
parent_task_id: TASK-6
project: frontend
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Starts from assistant-ui's default Tailwind/shadcn Thread theme and tunes it toward the Claude-inspired palette/typography/layout in docs/design/frontend-design.md's 'Visual design' section, plus the greeting-to-chat transition described in its 'Major components > Chat' section.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 assistant-ui's pre-styled Thread component renders the chat surface with no custom semantic CSS layer
- [ ] #2 Greeting state (centered, generous negative space, prominent input) transitions to the docked chat-input layout once the first message is sent
- [ ] #3 Palette (warm neutral base, single restrained accent), typography, and layout match docs/design/frontend-design.md's Visual design section, in both light and dark mode
- [ ] #4 Header is logo + team name only, no toolbar
<!-- AC:END -->
