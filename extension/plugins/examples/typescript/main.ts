import { ViewKey } from "@anz-bank/vscode-sysl-model";
import {
  defaultViewManagerConfig,
  Plugin,
  RenderResult,
  ViewEdits,
} from "@anz-bank/vscode-sysl-plugin";
import { TextDocumentChangeEvent } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DiagramModel } from "../../../views/diagram/model";

const plugin = new Plugin({
  rendering: {
    viewManagerConfig: defaultViewManagerConfig,
    onTextRender,
    onTextChange,
  },
});
plugin.createConnection();

// The document-agnostic parts of the view key.
const partialKey = {
  pluginId: "example",
  viewId: "example",
};

/** Determines what to render when the user requests rendering of a Sysl spec. */
async function onTextRender(
  e: TextDocumentChangeEvent<TextDocument>
): Promise<RenderResult | undefined> {
  const key: ViewKey = { ...partialKey, docUri: e.document.uri };

  const model: DiagramModel = {
    nodes: [{ key: "a" }, { key: "b" }],
    edges: [{ key: "a->b", from: "a", to: "b" }],
  };

  if (!plugin.viewManager?.get(key)) {
    return { open: [{ key, model }] };
  }
}

/** Determines what to render when the user updates a Sysl spec. */
async function onTextChange({ document: { uri: docUri } }): Promise<RenderResult | undefined> {
  const key: ViewKey = { ...partialKey, docUri };

  const model: DiagramModel = {
    nodes: [{ key: "a" }, { key: "b" }],
    edges: [{ key: "a->b", from: "a", to: "b" }],
  };

  if (plugin.viewManager?.get(key)) {
    return { edit: new ViewEdits().set(key, model) };
  }
}
