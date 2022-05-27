FROM --platform=$BUILDPLATFORM node:17.7-alpine3.14 AS client-builder
WORKDIR /ui
# cache packages in layer
COPY ui/package.json /ui/package.json
COPY ui/package-lock.json /ui/package-lock.json
ARG TARGETARCH
RUN yarn config set cache-folder /usr/local/share/.cache/yarn-${TARGETARCH}
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn-${TARGETARCH} yarn
# install
COPY ui /ui
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn-${TARGETARCH} \
    yarn build

FROM alpine as docker-ls

RUN \
  apk add --update zip wget && \
  wget --inet4-only https://github.com/mayflower/docker-ls/releases/download/v0.5.1/docker-ls-darwin-amd64.zip && \
  unzip docker-ls-darwin-amd64.zip -d darwin && \
  wget --inet4-only https://github.com/mayflower/docker-ls/releases/download/v0.5.1/docker-ls-linux-amd64.zip && \
  unzip docker-ls-linux-amd64.zip -d linux && \
  wget --inet4-only https://github.com/mayflower/docker-ls/releases/download/v0.5.1/docker-ls-windows-amd64.zip && \
  unzip docker-ls-windows-amd64.zip -d windows && \
  ls -la

FROM alpine
LABEL org.opencontainers.image.title="InterSystems" \
    org.opencontainers.image.description="View Docker images from InterSystems" \
    org.opencontainers.image.vendor="CaretDev Corp." \
    com.docker.desktop.extension.api.version=">= 0.2.3" \
    # com.docker.extension.screenshots="[]" \
    # com.docker.extension.detailed-description="This extension allows to see all available images with InterSystems IRIS and InterSystems tools" \
    # com.docker.extension.publisher-url="" \
    # com.docker.extension.additional-urls="[]" \
    # com.docker.extension.changelog="" \
    com.docker.desktop.extension.icon="intersystems.svg"

COPY docker-compose.yaml .
COPY metadata.json .
COPY intersystems.svg .
COPY --from=client-builder /ui/build ui

COPY --from=docker-ls /darwin/docker-ls /darwin/
COPY --from=docker-ls /linux/docker-ls /linux/
COPY --from=docker-ls /windows/docker-ls.exe /windows/

# COPY --from=builder /backend/bin/service /
# CMD /service -socket /run/guest-services/docker-intersystems.sock
# CMD /service -port 48739
