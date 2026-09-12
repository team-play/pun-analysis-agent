# Local Setup

Quick-start for going from a fresh clone to a running dev server in each domain. See [`project-spec.md`](project-spec.md) for the why behind the stack, and [`contracts.md`](contracts.md) for the API shapes.

## Secrets

API keys (Gemini, Firebase, GCP) are stored as **GitHub org/repo Secrets**, which power CI — they're not something you can pull down as a member, since GitHub only exposes secret values to Actions runners, not to people.

For local dev:
- **Gemini**: get your own key from [Google AI Studio](https://aistudio.google.com/) under the team's Google Cloud project.
- **GCP / Cloud Run**: ask to be added to the shared GCP project's IAM, then `gcloud auth application-default login` with your own account — no key to copy.
- If you genuinely can't self-serve a key (e.g. a service account credential someone else already created), ask that teammate to share the value out-of-band (1Password, DM) — never post it in Slack/GitHub/issues.

Put local secrets in `.env` / `.env.local` files inside the relevant package folder. The root [`.gitignore`](../.gitignore) already excludes `.env*`, so they won't get committed by accident.

## Inference (`inference/`)

Python + [`uv`](https://docs.astral.sh/uv/) (fast, reproducible dependency management — resolves and installs into a project-local `.venv` without needing a separate virtualenv command) + FastAPI + `ruff`.

```bash
cd inference
uv sync
uv run pytest
uv run ruff check .
uv run uvicorn main:app --reload
```

The dev server serves `POST /analyze` at `http://localhost:8000`.

## Backend (`backend/`)

Node/TypeScript + [Hono](https://hono.dev/) (a lightweight, TypeScript-first web framework) + pnpm. Genkit will be added here once the `analyze_pun` flow is implemented.

```bash
cd backend
pnpm install
pnpm dev
```

The dev server serves `GET /health` and `POST /api/chat` at `http://localhost:8080`. Sanity-check it with:

```bash
curl localhost:8080/health
```

## Frontend (`frontend/`)

Vite + React, pnpm.

```bash
cd frontend
pnpm install
pnpm dev
```

Opens the dev server at `http://localhost:5173`.

## Eval (`eval/`)

Python + `uv` + [marimo](https://marimo.io/) (reactive, git-diffable Python notebooks — cells re-run automatically based on their dependencies, and the notebook file is plain, readable Python rather than JSON).

```bash
cd eval
uv sync
uv run marimo edit notebooks/dummy_notebook.py
```

## Lint / format everywhere

```bash
# from the repo root — covers backend/ and frontend/ (shared Biome config)
pnpm run lint

# also from the repo root — validates every ```mermaid block in the repo's docs
pnpm run check:mermaid

# inside inference/ or eval/
uv run ruff check .
```

[`.github/workflows/lint.yml`](../.github/workflows/lint.yml) runs all of the above on every push/PR, so failures show up in CI even if you skip running them locally.
