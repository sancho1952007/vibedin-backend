# ── Build stage: runs natively on amd64 (fast) ──────────────────────
FROM --platform=$BUILDPLATFORM docker.io/oven/bun:1-alpine@sha256:26d8996560ca94eab9ce48afc0c7443825553c9a851f40ae574d47d20906826d AS builder
WORKDIR /usr/src/app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

COPY . .
RUN bun run build

# ── Runtime stage: arm64 image pulled from registry ──────────────────
FROM --platform=linux/arm64 docker.io/oven/bun:1-alpine@sha256:26d8996560ca94eab9ce48afc0c7443825553c9a851f40ae574d47d20906826d AS prod
WORKDIR /usr/src/app

# Copy only the built output — no dev tooling, no source files
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules

ENV NODE_ENV=production
USER bun
EXPOSE 3000
CMD ["bun", "run", "start"]