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

ARG detailed_description=

LABEL \
    org.opencontainers.image.title="InterSystems" \
    org.opencontainers.image.description="Convenient way to access InterSystems Container Registry, public and private images of such products as IRIS and IRIS for Health and many others in one place." \
    org.opencontainers.image.vendor="CaretDev Corp." \
    com.docker.desktop.extension.api.version=">= 0.2.3" \
    com.docker.extension.detailed-description=${detailed_description} \
    com.docker.extension.screenshots="[{\"url\":\"https://raw.githubusercontent.com/caretdev/docker-intersystems-extension/main/img/screenshot1.png\",\"alt\":\"Community images\"},{\"url\":\"https://raw.githubusercontent.com/caretdev/docker-intersystems-extension/main/img/screenshot2.png\",\"alt\":\"Community ARM64 images\"}]" \
    com.docker.extension.publisher-url="https://github.com/caretdev/docker-intersystems-extension" \
    com.docker.extension.additional-urls="[{\"title\":\"InterSystems\",\"url\":\"https://intersystems.com/\"},{\"title\":\"Support\",\"url\":\"https://github.com/caretdev/docker-intersystems-extension/issues\"},{\"title\":\"Discord\",\"url\":\"https://discord.gg/Bt5DUwJhdt\"}]" \
    com.docker.extension.changelog="" \
    com.docker.desktop.extension.icon="https://raw.githubusercontent.com/caretdev/docker-intersystems-extension/main/intersystems.svg"

COPY metadata.json .
COPY intersystems.svg .
COPY --from=client-builder /ui/build ui

COPY --from=docker-ls /darwin/docker-ls /darwin/
COPY --from=docker-ls /linux/docker-ls /linux/
COPY --from=docker-ls /windows/docker-ls.exe /windows/
