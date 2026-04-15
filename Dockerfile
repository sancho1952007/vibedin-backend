# Use the official Bun image as base
FROM docker.io/oven/bun:1-alpine@sha256:eeb45d705f56dc0ceea4bbe793f9386ae07d47e695424f0b1fd2b5a8feccd431 AS prod
WORKDIR /usr/src/app

# Copy lockfile & package.json first to leverage layer caching
COPY package.json bun.lock* ./

# Install only production dependencies
RUN bun install --frozen-lockfile --production

# Copy source files
COPY . .

# Build your project (if you compile TS)
RUN bun run build

# Optionally remove dev files or prune if needed (not always supported)
# RUN bun prune   # if your project/setup supports it

# Set environment
ENV NODE_ENV=production

# Run under non-root user (Bun image has user “bun”)
USER bun

# Expose your port
EXPOSE 3000

# Command to run your app – adjust if your entrypoint is different
CMD ["bun", "run", "start"]