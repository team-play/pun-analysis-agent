# Pun Analysis Agent

A conversational agent that detects and explains puns in text, built as a Gemini/Genkit-orchestrated pipeline with a dedicated inference service and a React chat frontend.

## Domains

| Domain | Owns | Owner |
|---|---|---|
| Inference | [`inference/`](inference/) — pun classifier, WSD, `/analyze` endpoint | TBD |
| Backend | [`backend/`](backend/) — Genkit orchestration, `analyze_pun` tool, `/api/chat` | TBD |
| Frontend | [`frontend/`](frontend/) — React chat UI on Firebase Hosting | TBD |
| Data / Eval | [`eval/`](eval/) — dataset curation, evaluation, write-up | TBD |

See [`docs/contracts.md`](docs/contracts.md) for the two cross-domain API contracts (`/analyze` and `/api/chat`).

## Getting started

```bash
cd inference && uv sync
cd backend && pnpm install
cd frontend && pnpm install
cd eval && uv sync
```

`frontend` and `backend` share a pnpm workspace, so `pnpm install` from the repo root also works for both.
