# Local Setup

Quick-start for going from a fresh clone to a running dev server in each domain. See [`project-spec.md`](project-spec.md) for the why behind the stack, and [`contracts.md`](contracts.md) for the API shapes.

## Automated setup

If you (or the agent helping you) would rather not go through the manual steps below one by one, see [`agent-setup.md`](agent-setup.md) — a tool-agnostic guide any agent can follow to detect what's installed, install what's missing (with confirmation), install dependencies, and validate the result via `node scripts/verify-setup.mjs`. The sections below are the manual/reference path — what that guide is automating, spelled out per domain.

Working across Frontend and Backend at once? `pnpm dev` from the repo root runs both dev servers concurrently (see "Lint / test / format everywhere" below) instead of opening two terminals.

## Secrets

API keys (Gemini, Firebase, GCP) are stored as **GitHub org/repo Secrets**, which power CI — they're not something you can pull down as a member, since GitHub only exposes secret values to Actions runners, not to people.

For local dev:
- **Gemini**: get your own key from [Google AI Studio](https://aistudio.google.com/) under the team's Google Cloud project.
- **GCP / Cloud Run**: ask to be added to the shared GCP project's IAM, then `gcloud auth application-default login` with your own account — no key to copy.
- If you genuinely can't self-serve a key (e.g. a service account credential someone else already created), ask that teammate to share the value out-of-band (1Password, DM) — never post it in Slack/GitHub/issues.

Put local secrets in `.env` / `.env.local` files inside the relevant package folder. The root [`.gitignore`](../.gitignore) already excludes `.env*`, so they won't get committed by accident.

### Frontend deploy secrets (CI only)

[`deploy-frontend.yml`](../.github/workflows/deploy-frontend.yml) builds `frontend/` and deploys it to Firebase Hosting (`pun-agent.web.app`) on every push to `main` that touches `frontend/**`, via [`FirebaseExtended/action-hosting-deploy`](https://github.com/FirebaseExtended/action-hosting-deploy). The target Firebase project ID (`pun-agent`) is committed in [`frontend/.firebaserc`](../frontend/.firebaserc) — not a secret, since a project ID isn't sensitive.

The one repo secret it needs (Settings → Secrets and variables → Actions) is already set:

- `GCP_SA_KEY` — the JSON key for `github-actions-deployer@pun-agent.iam.gserviceaccount.com`, the shared deploy service account for the whole `pun-agent` GCP project. It holds `roles/firebasehosting.admin` (this workflow) plus `roles/run.admin` and `roles/artifactregistry.writer` (for the backend/inference Cloud Run deploys in later tasks) — reused across all three deploy workflows rather than minting a separate key per target.

If it ever needs rotating:

```bash
gcloud iam service-accounts keys create github-actions-deployer-key.json \
  --iam-account="github-actions-deployer@pun-agent.iam.gserviceaccount.com"
```

Paste the contents into the `GCP_SA_KEY` secret, then delete the local file and revoke the old key (`gcloud iam service-accounts keys list`/`delete`) — it's a credential, not something to keep on disk or leave active once replaced.

No local Firebase login is required to develop `frontend/` day-to-day; this secret only matters for the CI deploy step.

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

Node/TypeScript + [Hono](https://hono.dev/) (a lightweight, TypeScript-first web framework) + [Genkit](https://genkit.dev/) (Google's AI SDK, via the `@genkit-ai/google-genai` plugin) + pnpm.

```bash
cd backend
pnpm install
cp .env.example .env.local  # then fill in GEMINI_API_KEY, per this doc's Secrets section
pnpm dev
pnpm test
```

The dev server serves `GET /health` and `POST /api/chat` at `http://localhost:8080`. `pnpm test` never needs `GEMINI_API_KEY` set — it runs against a Genkit test-double model instead (see [`engineering-practices.md`](engineering-practices.md)'s "Backend in isolation" section). Sanity-check the dev server with:

```bash
curl localhost:8080/health
```

`pnpm test` runs Node's built-in test runner (`node:test`, via `tsx`) against [`backend/tests/`](../backend/tests/) — see [`engineering-practices.md`](engineering-practices.md) for why no separate test framework is needed here.

## Frontend (`frontend/`)

Vite + React, pnpm.

```bash
cd frontend
pnpm install
pnpm dev
pnpm test
```

Opens the dev server at `http://localhost:5173`. `pnpm test` runs Vitest + React Testing Library (config in [`frontend/vite.config.ts`](../frontend/vite.config.ts)) — see [`design/frontend-design.md`](design/frontend-design.md)'s "Development & testing" section for what's covered.

`VITE_CHAT_ADAPTER=stub|live` (see [`engineering-practices.md`](engineering-practices.md); example in [`frontend/.env.example`](../frontend/.env.example)) picks between a stubbed backend and this repo's real one. Unset defaults to `stub`, which is what local dev and CI always use today — `live` is a placeholder that throws until the real Genkit-backed `ChatModelAdapter` lands (TASK-8), since `frontend/` has no live `/api/chat` to point at yet.

## Eval (`eval/`)

Python + `uv` + [marimo](https://marimo.io/) (reactive, git-diffable Python notebooks — cells re-run automatically based on their dependencies, and the notebook file is plain, readable Python rather than JSON).

```bash
cd eval
uv sync
uv run marimo edit notebooks/dummy_notebook.py
```

## Lint / test / format everywhere

```bash
# from the repo root — runs both frontend/ and backend/ dev servers together
pnpm dev

# from the repo root — runs both frontend/ and backend/ test suites
pnpm run test

# from the repo root — covers backend/ and frontend/ (shared Biome config)
pnpm run lint

# also from the repo root — validates every ```mermaid block in the repo's docs
pnpm run check:mermaid

# inside inference/ or eval/
uv run ruff check .
```

[`.github/workflows/lint.yml`](../.github/workflows/lint.yml) and [`.github/workflows/test.yml`](../.github/workflows/test.yml) run all of the above (lint/mermaid/ruff, and the frontend/backend test suites, respectively) on every push/PR, so failures show up in CI even if you skip running them locally.
