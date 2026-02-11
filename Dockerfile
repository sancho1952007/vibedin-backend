# syntax=docker/dockerfile:1

############################
# Stage 1 — Download release
############################
FROM debian:bookworm-slim AS downloader

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl jq ca-certificates && \
    rm -rf /var/lib/apt/lists/*

ARG GITHUB_OWNER
ARG GITHUB_REPO

RUN set -eux; \
    API_URL="https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest"; \
    JSON=$(curl -fsSL "$API_URL"); \
    DOWNLOAD_URL=$(echo "$JSON" | jq -r '.assets[] | select(.name=="linux-amd64") | .browser_download_url'); \
    if [ -z "$DOWNLOAD_URL" ] || [ "$DOWNLOAD_URL" = "null" ]; then \
      echo "Asset 'linux-amd64' not found"; exit 1; \
    fi; \
    curl -fsSL "$DOWNLOAD_URL" -o /app; \
    chmod +x /app

############################
# Stage 2 — Runtime
############################
FROM debian:bookworm-slim

# Install only runtime dependencies if needed
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        libstdc++6 \
        libgcc-s1 && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 appuser

COPY --from=downloader /app /usr/local/bin/app

USER appuser

ENTRYPOINT ["/usr/local/bin/app"]