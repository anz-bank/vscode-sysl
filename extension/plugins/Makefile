.PHONY: all plugins check-clean test

ARRAI = go run github.com/arr-ai/arrai/cmd/arrai

all: plugins check-clean test

%.arraiz: %.arrai $(shell find . -name '*.arrai')
	$(ARRAI) bundle $< > $@

plugins: \
	integration/integration_model_plugin.arraiz

check-clean: plugins
	git --no-pager diff HEAD && test -z "$$(git status --porcelain)"

# TODO: replace this with tests using sysl transform
test: plugins
	$(ARRAI) test
