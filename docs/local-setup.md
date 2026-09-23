# Local Setup

Quick-start for going from a fresh clone to a running dev server in each domain. See [`project-spec.md`](project-spec.md) for the why behind the stack, and [`contracts.md`](contracts.md) for the API shapes.

## Automated setup

If you (or the agent helping you) would rather not go through the manual steps below one by one, see [`agent-setup.md`](agent-setup.md) — a tool-agnostic guide any agent can follow to detect what's installed, install what's missing (with confirmation), install dependencies, and validate the result via `node scripts/verify-setup.mjs`. The sections below are the manual/reference path — what that guide is automating, spelled out per domain.

Working across Frontend and Backend at once? `pnpm dev` from the repo root runs both dev servers concurrently (see "Lint / test / format everywhere" below) instead of opening two terminals.

## Secrets

CI's deploy credential (`GCP_SA_KEY`) is a **GitHub organization Secret**, and the backend's production Gemini key lives in **GCP Secret Manager** (see "Backend deploy" below). Neither is something you can pull down as a member: GitHub only exposes secret values to Actions runners, and the Gemini secret is readable only by the backend's runtime service account.

For local dev:
- **Gemini**: get your own key from [Google AI Studio](https://aistudio.google.com/) under the AI Studio project shown as "pun-agent" (`gen-lang-client-0125403786`), not the GCP project `pun-agent`. That project has no billing, so its keys stay on Gemini's free tier; the free-tier limits are per project, so local keys share quota with production's.
- **GCP / Cloud Run**: ask to be added to the shared GCP project's IAM, then `gcloud auth application-default login` with your own account — no key to copy.
- If you genuinely can't self-serve a key (e.g. a service account credential someone else already created), ask that teammate to share the value out-of-band (1Password, DM) — never post it in Slack/GitHub/issues.

Put local secrets in `.env` / `.env.local` files inside the relevant package folder. The root [`.gitignore`](../.gitignore) already excludes `.env*`, so they won't get committed by accident.

### Frontend deploy (CI only)

[`deploy-frontend.yml`](../.github/workflows/deploy-frontend.yml) builds `frontend/` and deploys it to Firebase Hosting (`pun-agent.web.app`) on every push to `main` that touches `frontend/**`, via [`FirebaseExtended/action-hosting-deploy`](https://github.com/FirebaseExtended/action-hosting-deploy). The target Firebase project ID (`pun-agent`) is committed in [`frontend/.firebaserc`](../frontend/.firebaserc) — not a secret, since a project ID isn't sensitive.

The one secret it needs is already set, at the **organization** level (the org's Settings → Secrets and variables → Actions, not the repo's), and is visible to this repo:

- `GCP_SA_KEY` — the JSON key for `github-actions-deployer@pun-agent.iam.gserviceaccount.com`, the shared deploy service account for the whole `pun-agent` GCP project. It holds `roles/firebasehosting.admin` (this workflow) plus `roles/run.admin`, `roles/artifactregistry.writer` and a project-level `roles/iam.serviceAccountUser` (the Cloud Run deploys) — reused across all three deploy workflows rather than minting a separate key per target. The project-level `serviceAccountUser` and the long-lived JSON key (rather than Workload Identity Federation) are deliberate simplifications for a course project; see TASK-13's notes.

If it ever needs rotating:

```bash
gcloud iam service-accounts keys create github-actions-deployer-key.json \
  --iam-account="github-actions-deployer@pun-agent.iam.gserviceaccount.com"
```

Paste the contents into the `GCP_SA_KEY` secret, then delete the local file and revoke the old key (`gcloud iam service-accounts keys list`/`delete`) — it's a credential, not something to keep on disk or leave active once replaced.

No local Firebase login is required to develop `frontend/` day-to-day; this secret only matters for the CI deploy step.

### Backend deploy (CI only)

[`deploy-backend.yml`](../.github/workflows/deploy-backend.yml) builds [`backend/Dockerfile`](../backend/Dockerfile) on every pull request that touches the backend (build only, so a broken image fails the PR). On pushes to `main` it also pushes the image to Artifact Registry, deploys it to Cloud Run and smoke-tests `/health`, authenticating with the same `GCP_SA_KEY`. It needs no other GitHub secret: the Gemini key never passes through CI.

One-time GCP setup it relies on (already done, see TASK-13's notes):

| Resource | Where | Notes |
|---|---|---|
| Cloud Run service `pun-agent-backend` | `pun-agent`, `us-east1` | `https://pun-agent-backend-203365930808.us-east1.run.app` once first deployed. Public (`--allow-unauthenticated`; TASK-25 adds App Check inside the app), `--min-instances=0`, `--max-instances=1` |
| Service account `pun-agent-runtime@pun-agent.iam.gserviceaccount.com` | `pun-agent` | the identity the service runs as; can read only the secret below, no project-level roles |
| Secret `gemini-api-key-runtime` | `pun-agent` Secret Manager | the production Gemini key, mounted as `GEMINI_API_KEY` |
| Gemini API key `pun-agent-runtime` | `gen-lang-client-0125403786` (no billing, free tier) | restricted to the Gemini API |
| Docker repo `pun-agent` | Artifact Registry, `us-east1` | images tagged by commit SHA; a cleanup policy keeps the 5 most recent (free tier is 0.5 GB) |

To rotate the production Gemini key, create a new key in the AI Studio project and pipe it straight into a new secret version, so it's never printed:

```bash
gcloud services api-keys get-key-string <NEW_KEY_UID> --project=gen-lang-client-0125403786 \
    --format='value(keyString)' | tr -d '\n' \
  | gcloud secrets versions add gemini-api-key-runtime --project=pun-agent --data-file=-
```

The `tr -d '\n'` matters: `--format='value(...)'` adds a trailing newline, which would make Gemini reject the key. Redeploy (re-run the workflow) so new instances pick up the `latest` version, then delete the old key.

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
