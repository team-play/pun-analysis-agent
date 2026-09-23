# Build context is the repo root, since pnpm's lockfile and workspace settings
# live there:  docker build -f backend/Dockerfile .
# What gets sent is allowlisted in backend/Dockerfile.dockerignore.

FROM node:22-slim AS build
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Same pnpm as local dev and CI: the version pinned in package.json's
# packageManager (minus any +sha512 integrity suffix, which npm can't parse).
# npm rather than Corepack, which Node stops bundling from v25.
RUN npm install -g "$(node -p 'require("./package.json").packageManager.split("+")[0]')"
COPY backend/package.json backend/
RUN pnpm install --frozen-lockfile --filter backend
COPY backend/ backend/
RUN pnpm --filter backend run build
# A production-only node_modules for the runtime stage, at the locked
# versions. --legacy because backend has no workspace dependencies to inject.
# On a dev machine this command also strips devDependencies from the
# workspace's own node_modules; in this throwaway build stage that's harmless.
RUN pnpm --filter backend deploy --legacy --prod --frozen-lockfile /prod/backend

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /prod/backend/package.json ./
COPY --from=build /prod/backend/node_modules ./node_modules
COPY --from=build /repo/backend/dist ./dist
USER node
# Cloud Run sets PORT; config.ts falls back to 8080 locally.
EXPOSE 8080
CMD ["node", "dist/index.js"]
