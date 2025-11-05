# Use the official Bun image as base
FROM oven/bun:1 AS prod
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