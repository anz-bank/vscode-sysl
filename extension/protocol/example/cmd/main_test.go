package main

import (
	"github.com/anz-bank/vscode-sysl/extension/protocol"
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestInitialize(t *testing.T) {
	t.Parallel()

	req := &protocol.Request{Initialize: &protocol.InitializeRequest{}}
	res := handleRequest(req)
	assert.NotNil(t, res)
	assert.Nil(t, res.Error)
}

func TestOnChange(t *testing.T) {
	t.Parallel()

	req := &protocol.Request{Onchange: &protocol.OnChangeRequest{}}
	res := handleRequest(req)
	assert.NotNil(t, res)
	assert.Nil(t, res.Error)
}

func TestEmptyRequest_Error(t *testing.T) {
	t.Parallel()

	res := handleRequest(&protocol.Request{})
	assert.NotNil(t, res)
	assert.NotNil(t, res.Error)
}
