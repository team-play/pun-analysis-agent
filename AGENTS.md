# Agent Instructions

Instructions for any agent (Claude Code or otherwise) working in this repo.

## Discovery

Before making a change — especially one that touches more than one domain — read:
- [`docs/local-setup.md`](docs/local-setup.md) for how each package (`inference/`, `backend/`, `frontend/`, `eval/`) is installed and run locally.
- [`docs/project-spec.md`](docs/project-spec.md) for the stack, architecture, and which domain owns what.
- [`docs/contracts.md`](docs/contracts.md) for the exact `/analyze` and `/api/chat` schemas. Treat these as the source of truth — if a change requires altering either shape, update `contracts.md` in the same change and flag it, since both sides of the contract depend on it.

## Coding guide

- Write idiomatic code for whichever language/framework you're in, not a generic style forced across all four packages:
  - `backend/`: idiomatic Hono (middleware, `c.json`/`c.text` helpers, route composition) — see [`backend/src/index.ts`](backend/src/index.ts).
  - `inference/`: idiomatic FastAPI + Pydantic (response models, dependency injection) — see [`inference/main.py`](inference/main.py).
  - `frontend/`: idiomatic React/Vite conventions.
  - `inference/` and `eval/`: idiomatic `uv`/`ruff` project conventions (respect `pyproject.toml`, don't hand-roll what `uv` already manages).
- DRY: before adding new logic, check whether it already exists — especially anything touching the `/analyze` or `/api/chat` contracts, where duplicated schema definitions are the most likely place for the two sides to drift.
- No speculative abstractions or unused flexibility — match the scope of the task in front of you.

## Code review

Before considering any non-trivial change done, solicit a critical, adversarial review from a subagent (e.g. this repo's `code-review` skill, or an equivalent independent review pass) rather than self-certifying the diff. Two things are non-negotiable in that review:
- **Test coverage** — new logic needs tests that would actually fail if the logic were wrong, not just tests that exercise the happy path.
- **Human-readable code** — a teammate who wasn't in the room should be able to follow the code without extra explanation.

## Performance

This runs entirely on free tiers (Cloud Run, Firebase Hosting, Gemini's free quota), so memory and compute efficiency are a design constraint from the start, not a later optimization pass:
- Keep container images small and dependency lists tight — every extra package is cold-start cost on Cloud Run.
- Avoid loading heavyweight resources (models, large lookup tables) eagerly at import time if they can be loaded lazily or scoped to where they're needed.
- Watch for anything that would multiply Gemini API calls or Cloud Run invocations unnecessarily (retries without backoff, polling, redundant tool calls).

**Perf budgets:** TBD — placeholder until `inference/` has a real classifier to measure. Fill in concrete numbers once it exists, and re-check them whenever the model or hosting tier changes.

| Metric | Budget | Status |
|---|---|---|
| `/analyze` p50 latency | TBD | not yet measured |
| `/analyze` p95 latency | TBD | not yet measured |
| Inference container memory ceiling | TBD | not yet measured |
| `/api/chat` end-to-end latency (excluding cold start) | TBD | not yet measured |
