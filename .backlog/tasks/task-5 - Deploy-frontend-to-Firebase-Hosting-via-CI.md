---
id: TASK-5
title: Deploy frontend to Firebase Hosting via CI
status: In Progress
assignee:
  - '@yaitorr'
created_date: '2026-09-17 23:33'
updated_date: '2026-09-20 09:28'
due_date: '2026-09-21'
labels: []
milestone: m-0
dependencies: []
references:
  - docs/local-setup.md
  - .github/workflows/deploy-frontend.yml
project: frontend
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
deploy-frontend.yml is currently a placeholder (see the comment at the top of the file) — nothing in frontend/ has ever reached Firebase Hosting. Getting this pipeline working against whatever's currently in frontend/ (even the Vite starter) proves the CI/CD path end-to-end before any real UI work lands, so every later frontend slice ships automatically instead of needing its own deploy work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Pushing to main with a change under frontend/** builds the Vite app and deploys the build output to Firebase Hosting
- [x] #2 Required Firebase secrets/config for the deploy step are documented in docs/local-setup.md
- [x] #3 A push that only touches backend/ or inference/ does not trigger this workflow
- [ ] #4 The deployed Hosting URL is reachable and serves the current frontend/ build
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the placeholder .github/workflows/deploy-frontend.yml with a real workflow: checkout, pnpm/action-setup + actions/setup-node@v4 (node 22, pnpm cache) matching test.yml/lint.yml's pattern, pnpm install --frozen-lockfile, pnpm --filter frontend run build, then FirebaseExtended/action-hosting-deploy@v0 (entryPoint: frontend, channelId: live) using two new secrets: FIREBASE_SERVICE_ACCOUNT and FIREBASE_PROJECT_ID. Keep the existing paths: [frontend/**] + push:main trigger (covers AC3).
2. Document the two new secrets in docs/local-setup.md's Secrets section: what they are, the gcloud/Firebase steps to generate a service account key scoped to Firebase Hosting admin, and where to add them as GitHub repo secrets (covers AC2).
3. Verify locally: pnpm --filter frontend run build produces frontend/dist matching frontend/firebase.json's public:dist, and pnpm run lint passes.
4. Solicit code review (test coverage N/A for CI config, but check workflow correctness/readability) and architectural review per AGENTS.md (new CI deploy target/dependency) before finalizing.
5. Flag explicitly to the user that AC1 and AC4 (workflow actually deploying, URL reachable) can only be verified once they create the Firebase project and add the two GitHub secrets and a push to main runs the workflow — that step is outside what I can do from here.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Replaced the placeholder deploy-frontend.yml with a real workflow: pnpm/action-setup + setup-node (node 22, pnpm cache, matching test.yml/lint.yml) -> pnpm install --frozen-lockfile -> pnpm --filter frontend run build -> FirebaseExtended/action-hosting-deploy@v0 (entryPoint: frontend, channelId: live), gated on push:main + paths:frontend/** (unchanged from placeholder, so AC3 still holds structurally). Documented the two required secrets (FIREBASE_SERVICE_ACCOUNT, FIREBASE_PROJECT_ID) and how to mint the service account key in docs/local-setup.md. Verified locally: pnpm --filter frontend run build succeeds and outputs to frontend/dist, matching firebase.json's public:dist; pnpm run lint and pnpm run check:mermaid both pass. Got a code-review pass (clean; one flagged item about editing the backlog file directly was a false positive -- those edits went through backlog task edit) and an architectural review per AGENTS.md (clean; build output path confirmed correct, no contract/topology contradictions, only a non-blocking note that the GH Action is pinned to a floating major tag and the service account key is long-lived). AC1 and AC4 need an actual Firebase project + the two GitHub secrets to exist and a push to main to run before they can be verified with real evidence -- no Firebase project exists yet per repo docs (project-spec.md names Firebase Hosting as the target but no project ID/config is recorded anywhere). Leaving task In Progress pending that setup; checked AC2 and AC3 only.

Corrected the deploy workflow after checking the real GCP project directly (gcloud, authenticated as the user): project is 'pun-agent', Hosting site pun-agent.web.app is already provisioned, and github-actions-deployer@pun-agent.iam.gserviceaccount.com already holds roles/firebasehosting.admin (plus run.admin/artifactregistry.writer for later Cloud Run tasks) -- confirmed with the user this is what GCP_SA_KEY (already set as a repo secret) holds. Updated deploy-frontend.yml to use secrets.GCP_SA_KEY instead of asking for new FIREBASE_SERVICE_ACCOUNT/FIREBASE_PROJECT_ID secrets, added frontend/.firebaserc (project id pun-agent, not secret) so the action resolves the project without an extra secret, and rewrote the local-setup.md doc section to describe the already-provisioned secret/SA instead of generic setup steps. Lint and frontend build reverified after the change. AC1/AC4 still need an actual push to main (current branch is docs/milestone-3-excerpt) to observe a real CI run -- have not pushed/merged anything, pending user direction.
<!-- SECTION:NOTES:END -->
