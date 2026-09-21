---
id: TASK-17
title: Retrieve WordNet/Wiktionary candidate senses for pun-word candidates
status: To Do
assignee: []
created_date: '2026-09-20 10:04'
labels:
  - wsd
milestone: m-6
dependencies:
  - TASK-1
references:
  - docs/design/sense-selection.md
project: inference
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Step 2 of docs/design/sense-selection.md's approach: for each POS-tagged candidate from TASK-1, pull WordNet synsets, glosses, and hypernym chains (Tier 0, Open English WordNet). When a candidate lemma has 0-1 senses, expand the inventory with Wiktionary definitions (Tier 2, kaikki.org dumps) before scoring gives up on it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a candidate word and POS tag, returns its WordNet synsets with glosses and hypernym chains
- [ ] #2 When WordNet returns 0-1 senses for a candidate, Wiktionary definitions are pulled as a fallback sense inventory
- [ ] #3 Unit tests cover a candidate with 2+ WordNet senses and one with a coverage gap requiring the Wiktionary fallback
<!-- AC:END -->
