# syntax=docker/dockerfile:1

############################
# Stage 1 — Download binary
############################
FROM alpine:3.19 AS downloader

RUN apk add --no-cache curl jq

ARG GITHUB_OWNER
ARG GITHUB_REPO

RUN set -eux; \
    API_URL="https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest"; \
    \
    JSON=$(curl -fsSL "$API_URL"); \
    \
    DOWNLOAD_URL=$(echo "$JSON" | jq -r \
      '.assets[] | select(.name=="linux-amd64") | .browser_download_url'); \
    \
    if [ -z "$DOWNLOAD_URL" ] || [ "$DOWNLOAD_URL" = "null" ]; then \
      echo "Asset 'linux-amd64' not found in latest release"; \
      exit 1; \
    fi; \
    \
    echo "Downloading $DOWNLOAD_URL"; \
    curl -fsSL "$DOWNLOAD_URL" -o /app; \
    chmod +x /app


############################
# Stage 2 — Minimal runtime
############################
FROM alpine:3.19

RUN adduser -D appuser

COPY --from=downloader /app /usr/local/bin/app

USER appuser

ENTRYPOINT ["/usr/local/bin/app"]