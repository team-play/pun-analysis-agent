# Pun Analysis Agent

A conversational agent that detects and explains puns in text, built as a Gemini/Genkit-orchestrated pipeline with a dedicated inference service and a React chat frontend.

## Domains

| Domain | Owns | Owner |
|---|---|---|
| Inference | [`inference/`](inference/) — pun classifier, WSD, `/analyze` endpoint | Prateek Grover, Livia Esquejo (split: detection / sense selection) |
| Backend | [`backend/`](backend/) — Genkit orchestration, `analyze_pun` tool, `/api/chat` | Andi J. Castillo, Yai Torres |
| Frontend | [`frontend/`](frontend/) — React chat UI on Firebase Hosting | Andi J. Castillo, Yai Torres |
| Data / Eval | [`eval/`](eval/) — dataset curation, evaluation, write-up | Prateek Grover, Livia Esquejo (lead); all four contribute |

See [`docs/project-spec.md`](docs/project-spec.md) for the full spec (stack, architecture, task breakdown), [`docs/milestones/milestone-3.md`](docs/milestones/milestone-3.md) for the reasoning behind the domain split above, [`docs/contracts.md`](docs/contracts.md) for the two cross-domain API contracts (`/analyze` and `/api/chat`), [`docs/design/`](docs/design/) for deeper technical designs (e.g. sense selection) as they're written, [`docs/references.md`](docs/references.md) for APA 7 citations, and [`docs/local-setup.md`](docs/local-setup.md) to get a dev server running locally.

## Getting started

```bash
cd inference && uv sync
cd backend && pnpm install
cd frontend && pnpm install
cd eval && uv sync
```

`frontend` and `backend` share a pnpm workspace, so `pnpm install` from the repo root also works for both.
