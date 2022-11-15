import { ViewKey } from "@anz-bank/vscode-sysl-model";
import {
  defaultViewManagerConfig,
  Plugin,
  RenderResult,
  ViewEdits,
  ViewMeta,
} from "@anz-bank/vscode-sysl-plugin";
import { TextDocumentChangeEvent } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DiagramModel } from "../../views/diagram/model";
import { buildModel } from "./diagram";

const plugin = new Plugin({
  rendering: {
    viewManagerConfig: defaultViewManagerConfig,
    onDidOpen,
    onTextChange,
  },
});
plugin.createConnection();

// The document-agnostic parts of the ERD view key.
const partialKey: ViewKey = {
  docUri: "",
  pluginId: "sysld",
  viewId: "diagram",
};

/** The metadata for the view without a particular key. */
const partialMeta: ViewMeta = { label: "Sysl", kind: "diagram" };

/** Determines what to render when the user requests rendering of a Sysl spec. */
async function onDidOpen(
  e: TextDocumentChangeEvent<TextDocument>
): Promise<RenderResult | undefined> {
  const key: ViewKey = { ...partialKey, docUri: e.document.uri };

  if (!plugin.viewManager?.get(key)) {
    const model = await buildModelForKey(key);
    if (model.nodes.length) {
      return { open: [{ key, model }] };
    }
  }
}

/** Determines what to render when the user updates a Sysl spec. */
async function onTextChange({ document: { uri: docUri } }): Promise<RenderResult | undefined> {
  const key: ViewKey = { ...partialKey, docUri };

  if (plugin.viewManager?.get(key)) {
    return { edit: new ViewEdits().set(key, await buildModelForKey(key)) };
  }
}

/** Returns a model for the ERD diagram. */
async function buildModelForKey(key: ViewKey): Promise<DiagramModel> {
  const source = plugin.getDocument(key.docUri)?.getText();
  if (!source) {
    throw new Error("must have Sysld source to generate Sysl diagram");
  }
  const module: any = JSON.parse(source);
  return { meta: { ...partialMeta, key }, ...(await buildModel(module)) };
}
