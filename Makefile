IMAGE?=caretdev/intersystems-extension
TAG?=$(shell jq -r '.version' ui/package.json)

DESCRIPTION=$(shell cat extension.html | awk '{print}' ORS=' ')

BUILDER=buildx-multi-arch
BUILD_FLAGS=--build-arg TAG=$(TAG) --tag=$(IMAGE):$(TAG) --tag=$(IMAGE):latest --build-arg 'detailed_description=$(DESCRIPTION)' --progress plain

INFO_COLOR = \033[0;36m
NO_COLOR   = \033[m

get-list:
	docker-ls repositories -r https://containers.intersystems.com -l 1 -j -u anonymous > ui/public/all.json

build-extension: ## Build service image to be deployed as a desktop extension
	docker build $(BUILD_FLAGS) .

install-extension: build-extension ## Install the extension
	docker extension install -f $(IMAGE):$(TAG)

update-extension: build-extension ## Update the extension
	docker extension update -f $(IMAGE):$(TAG)

validate-extension: build-extension ## Validate the extension
	docker extension validate $(IMAGE):$(TAG)

prepare-buildx: BUILD_FLAGS+= --builder=$(BUILDER) --platform=linux/amd64,linux/arm64  ## Create buildx builder for multi-arch build, if not exists
	docker buildx inspect $(BUILDER) || docker buildx create --name=$(BUILDER) --driver=docker-container --driver-opt=network=host

push-extension: ## Build & Upload extension image to hub. Do not push if tag already exists: make push-extension tag=0.1
	docker pull $(IMAGE):$(TAG) && echo "Failure: Tag already exists" || docker buildx build --push $(BUILD_FLAGS) .

debug:
	docker extension dev debug $(IMAGE)
	docker extension dev ui-source $(IMAGE) http://localhost:3000/

undebug:
	docker extension dev reset $(IMAGE)

help: ## Show this help
	@echo Please specify a build target. The choices are:
	@grep -E '^[0-9a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "$(INFO_COLOR)%-30s$(NO_COLOR) %s\n", $$1, $$2}'

.PHONY: extension push-extension help
