// +build tools

package main

import (
	// Prevent 'go mod tidy' from removing below packages, otherwise CI steps fail.
	_ "github.com/anz-bank/sysl/cmd/sysl"
	_ "github.com/arr-ai/arrai/cmd/arrai"
	_ "github.com/atombender/go-jsonschema/cmd/gojsonschema"
)
