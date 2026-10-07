---
name: gemini-personal-project
description: Walks a contributor through creating their own free-tier Gemini project in Google AI Studio and binding its API key to the local Backend for the pun-analysis-agent repo, so local runs stop spending production's Gemini quota. Use whenever someone needs a GEMINI_API_KEY for local work, asks how to get a Gemini key or set up AI Studio, hits a missing-key error like `FAILED_PRECONDITION: Please pass in the API key` from the Backend, wants to chat with real Gemini locally, or is still using the team's AI Studio project (gen-lang-client-0125403786) for local runs. Assumes no Google Cloud experience.
---

# Personal Gemini project

Gemini's free-tier limits apply **per project, not per key**. A local run that uses a key from the team's project spends production's quota, and has taken the deployed site down before (TASK-45, TASK-31). A personal project gets its own free-tier quota, so local runs can't touch production's.

The contributor does the console steps; you guide them. Then **they** run a setup script that reads the key from a hidden prompt, checks it with Google and writes it to `backend/.env.local`.

## Rules

- **Never ask for the key in chat, and never accept it there.** If they paste a key into the conversation anyway, tell them to treat it as leaked: delete it in AI Studio, create a new one, and use only the script. Don't write it to any file yourself.
- **Never run the setup script for them.** Your shell can't take hidden input. They run it in their own terminal.
- AI Studio's UI changes often. Before starting, fetch <https://ai.google.dev/gemini-api/docs/api-key> and <https://ai.google.dev/gemini-api/docs/billing> and use the labels written there if they differ from the ones below. When unsure what they're seeing, ask them to describe the screen rather than guessing.
- Go one step at a time and wait for them to confirm each one. This is new ground for most of the team.

## Steps

### 1. Pick the Google account

They need a Google account that can use AI Studio. A personal Gmail account is the safe choice: school or work accounts are sometimes blocked from AI Studio by their admins. If AI Studio says it isn't available for their account, switch accounts rather than troubleshooting.

### 2. Open AI Studio and find the project

Have them open <https://aistudio.google.com/apikey>.

- **First time in AI Studio:** after accepting the terms, AI Studio creates a default project and a key for them. That project is what they want, and they can rename it under **Projects** (e.g. "pun-agent local").
- **Already used AI Studio or Google Cloud:** have them create a fresh project for this rather than reuse one, since an existing project may already have billing linked (see step 3).

Explain the naming, because this is the confusing part:

- An AI Studio project *is* a Google Cloud project underneath. AI Studio usually gives it an ID like `gen-lang-client-0123456789`.
- The team's projects are **not** theirs to use for local work. Those are the AI Studio project shown as "pun-agent" (`gen-lang-client-0125403786`) and the separate Google Cloud project `pun-agent`, which hosts Cloud Run and Firebase. If they were added to either, make sure the project selected in AI Studio is their own.

### 3. Make sure the project has no billing

A project with no billing account linked stays on the free tier: when it runs out of quota it answers 429 and stops, and nothing can be charged. **A project with billing turned on gets charged for usage past the free tier.**

- They should **not** click **Set up billing**, **Buy credits** or **Setup auto-reload**, now or later.
- On the **Projects** page, the project should show as free tier. If it shows a paid tier or a linked billing account, the project is already attached to a billing account, possibly one they set up for something else. Have them create another project (step 2) instead of trying to unlink it.

### 4. Create a key restricted to the Gemini API

On the **API Keys** page, have them create a key in **their** project (**Create API key**, then pick the project).

- Since May 2026, AI Studio creates *authorization keys* by default, which are bound to a service account and limited from the start. These may not start with `AIza`, and that's expected.
- If the key shows an **Unrestricted** label (an older *standard* key), have them hover it, choose **Add restrictions**, pick **Restrict to Gemini API only** and click **Restrict key**. Then a leaked key can only call Gemini.

Have them copy the key, but **not** paste it anywhere except the script's prompt in step 5.

### 5. Bind the key

From the repo root, in **their own terminal** (not through you):

```bash
pnpm --filter backend run setup:gemini
```

It prompts for the key without echoing it. For someone using a password manager's CLI, piping works too, e.g. `op read "op://…" | pnpm --filter backend run setup:gemini`. The script then:

- checks the key with Google by reading the pinned model's metadata rather than generating anything;
- on success, sets `GEMINI_API_KEY` in `backend/.env.local`. It keeps every other line, creates the file from `.env.example` if it doesn't exist, and makes it readable only by them (native Windows ignores this);
- pins `GEMINI_MODEL` to a Flash-Lite model unless the file already sets one. Flash-Lite has the most free requests a day, and pinning stops a 429 from stepping down to `gemini-3.8-flash`, which allows only 20 a day.

If it fails, the message says why: an invalid key, a key not allowed to use the Gemini API, a model the key can't use, or no connection. Nothing is written on failure, so they can just fix it and run it again.

On native Windows, they should run it from PowerShell or Windows Terminal: Git Bash without `winpty` can't hide the key as they type.

If the script warns that `GEMINI_API_KEY` or `GEMINI_MODEL` is set in their shell, help them remove it from their shell profile (e.g. `~/.zshrc`) and open a new terminal. Node's `--env-file` never overrides a variable that's already set, so the Backend would otherwise ignore the file.

If they had a local key in the team's project, have them delete it in AI Studio once their own works.

### 6. Check it works

Have them start the Backend (`pnpm --filter backend dev`) and send it one message, following `docs/local-setup.md`'s Backend section. For a fully local chat in the browser without the team's App Check debug token, point them to the `APP_CHECK=off` / `VITE_APP_CHECK=off` pair in `docs/local-setup.md`'s Frontend section.

### 7. Explain what the quota rules still mean

AGENTS.md's "Gemini quota" rules protect the team project and production, so they no longer bind runs on a personal project. Free-tier limits still apply per model, so a long experiment can still hit 429s on their own project. The limits table in AGENTS.md is a good guide to what they get.

## Report back

Tell them which model local runs use. Remind them the key lives only in `backend/.env.local` (git-ignored) and their AI Studio account, and to delete it in AI Studio if it ever leaks.
