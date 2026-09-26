.DEFAULT_GOAL := help
.PHONY: help install start ios android lint typecheck test check clean

help: ## Show available targets
	@grep -E '^[a-z]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-10s %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

start: ## Start the Expo dev server
	npm start

ios: ## Build and run on iOS (development build)
	npm run ios

android: ## Build and run on Android (development build)
	npm run android

lint: ## Run ESLint
	npm run lint

typecheck: ## Run the TypeScript compiler
	npm run typecheck

test: ## Run the unit tests
	npm test

check: lint typecheck test ## Run lint, typecheck and tests

clean: ## Remove node_modules and the Expo cache, then reinstall
	rm -rf node_modules .expo
	npm install
