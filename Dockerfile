# ── Build stage: runs natively on amd64 (fast) ──────────────────────
FROM --platform=$BUILDPLATFORM docker.io/oven/bun:1-alpine@sha256:26d8996560ca94eab9ce48afc0c7443825553c9a851f40ae574d47d20906826d AS builder
WORKDIR /usr/src/app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

COPY . .
RUN bun run build

# ── Runtime stage: arm64 image pulled from registry ──────────────────
FROM docker.io/oven/bun:1-alpine@sha256:eeb45d705f56dc0ceea4bbe793f9386ae07d47e695424f0b1fd2b5a8feccd431 AS prod
WORKDIR /usr/src/app

# Copy only the built output — no dev tooling, no source files
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules

ENV NODE_ENV=production
USER bun
EXPOSE 3000
CMD ["bun", "./dist/index.js"]