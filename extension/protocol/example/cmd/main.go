package main

import (
	"encoding/json"
	"fmt"
	"github.com/anz-bank/vscode-sysl/extension/protocol"
	"io/ioutil"
	"log"
	"os"
)

func main() {
	req, err := readStdin()
	if err != nil {
		log.Fatalf("request parse failed: %s\n", err)
	}

	res := handleRequest(req)
	bs, err := json.Marshal(res)
	if err != nil {
		log.Fatalf("response marshal failed: %s\n", err)
	}
	os.Stdout.Write(bs)
}

func readStdin() (*protocol.Request, error) {
	stat, _ := os.Stdin.Stat()
	if (stat.Mode() & os.ModeCharDevice) == 0 {
		bs, err := ioutil.ReadAll(os.Stdin)
		if err != nil {
			return nil, err
		}
		example := &protocol.Request{}
		if err := json.Unmarshal(bs, example); err != nil {
			return nil, err
		}
		return example, nil
	} else {
		return nil, fmt.Errorf("send input to stdin")
	}
}

func errorResponse(err error) *protocol.Response {
	return &protocol.Response{Error: &protocol.Error{Message: strptr(err.Error())}}
}

func handleRequest(req *protocol.Request) *protocol.Response {
	if req.Initialize != nil {
		res, err := handleInitialize(req.Initialize)
		if err != nil {
			return errorResponse(err)
		}
		return &protocol.Response{Initialize: res}
	} else if req.Onchange != nil {
		res, err := handleOnChange(req.Onchange)
		if err != nil {
			return errorResponse(err)
		}
		return &protocol.Response{Onchange: res}
	}
	return errorResponse(fmt.Errorf("unknown request type"))
}

var exampleType = &protocol.DiagramDescriptor{
	Id: strptr("example"),
}

func handleInitialize(request *protocol.InitializeRequest) (*protocol.InitializeResponse, error) {
	return &protocol.InitializeResponse{
		Capabilities: &protocol.ServerCapabilities{
			Diagrams: &protocol.DiagramCapabilities{
				Availabilities: []protocol.DiagramCapabilitiesAvailabilitiesElem{
					{
						Type:      exampleType,
						Available: newTrue(),
					},
				},
			},
		},
	}, nil
}

func handleOnChange(request *protocol.OnChangeRequest) (*protocol.OnChangeResponse, error) {
	return &protocol.OnChangeResponse{
		RenderDiagram: []protocol.Diagram{
			{
				Type: exampleType,
				Content: &protocol.DiagramData{
					Nodes: []protocol.Node{
						{"key": "a"},
						{"key": "b"},
					},
					Edges: []protocol.Edge{
						{"key": "a->b", "from": "a", "to": "b"},
					},
				},
			},
		},
	}, nil
}

func strptr(str string) *string {
	return &str
}

func newTrue() *bool {
	b := true
	return &b
}
