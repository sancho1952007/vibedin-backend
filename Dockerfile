# syntax=docker/dockerfile:1

############################
# Stage 1 — Download release
############################
FROM debian:bookworm-slim AS downloader

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl jq ca-certificates tar && \
    rm -rf /var/lib/apt/lists/*

ARG GITHUB_OWNER
ARG GITHUB_REPO

RUN set -eux; \
    API_URL="https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest"; \
    \
    curl -fsSL "$API_URL" -o /tmp/release.json; \
    \
    DOWNLOAD_URL=$(jq -r '.assets[0].browser_download_url' /tmp/release.json); \
    \
    if [ -z "$DOWNLOAD_URL" ] || [ "$DOWNLOAD_URL" = "null" ]; then \
        echo "No release asset found"; \
        cat /tmp/release.json; \
        exit 1; \
    fi; \
    \
    curl -fsSL "$DOWNLOAD_URL" -o /tmp/app.tar.gz; \
    \
    mkdir -p /tmp/extract; \
    tar -xzf /tmp/app.tar.gz -C /tmp/extract; \
    \
    mv /tmp/extract/linux-amd64 /app; \
    chmod +x /app

############################
# Stage 2 — Runtime
############################
FROM debian:bookworm-slim

RUN useradd -m -u 1000 appuser

COPY --from=downloader /app /usr/local/bin/app

USER appuser

ENTRYPOINT ["/usr/local/bin/app"]
