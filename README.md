InterSystems Docker Extension
===

[Extension for Docker Desktop](https://docs.docker.com/desktop/extensions/). Allows to see what is available on containers.intersystems.com, and pull images. To access non-community images, supports authorization made by `docker login`

![Screenshot](https://raw.githubusercontent.com/caretdev/docker-intersystems-extension/main/img/screenshot1.png)

Installation
---

This project have not published in Docker Extensions Marketplace, yet. 
And it requires Docker Extensions SDK installed manually, to be able to install extensions not available on marketplace manually. Please follow the [official instructions](https://docs.docker.com/desktop/extensions-sdk) and install Docker Extensions SDK.

After installing SDK, docker command will be able to use new command

```shell
docker extensions
```

And to install this extensions, just use this command

```shell
docker extensions install caretdev/intersystems-extension:0.0.2
```

Or update alredy installed extension

```shell
docker extensions update caretdev/intersystems-extension:0.0.2
```

And you can access to installed extension from Extensions list in Docker Desktop

![menu](https://raw.githubusercontent.com/caretdev/docker-intersystems-extension/main/img/full-screenshot.png)

There are a few options, that helps to filter the list of images available.

- Community, swiche between General version of IRIS and Community Edition
- ARM64, to see only ARM64 images
- Major versions only, filters to show only latest major versions (e.g. 2022, 2021, 2020)

![Screenshot](https://raw.githubusercontent.com/caretdev/docker-intersystems-extension/main/img/screenshot2.png)

To be able to see general versions of IRIS, please follow the instructions [here](https://community.intersystems.com/post/introducing-intersystems-container-registry) regarding `docker login`

Development
---

[Docker Extension SDK](https://docs.docker.com/desktop/extensions-sdk) is required. Clone this repo.

```shell
git clone https://github.com/caretdev/docker-intersystems-extension.git
cd docker-intersystems-extension
```

To build and install docker extension, use this command

```shell
make install-extension
```
