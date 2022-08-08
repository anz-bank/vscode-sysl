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
import { URI } from "vscode-uri";
import { Sysl } from "../../tools/sysl";
import { DiagramModel } from "../../views/diagram/model";
import { buildModel } from "./diagram";

const plugin = new Plugin({
  rendering: {
    viewManagerConfig: defaultViewManagerConfig,
    onTextRender,
    onTextChange,
  },
});
plugin.createConnection();

// The document-agnostic parts of the ERD view key.
const partialKey: ViewKey = {
  docUri: "",
  pluginId: "erd",
  viewId: "diagram",
};

/** The metadata for the view without a particular key. */
const partialMeta: ViewMeta = { label: "ERD", kind: "diagram" };

/** Determines what to render when the user requests rendering of a Sysl spec. */
async function onTextRender(
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
  // TODO: render model from notification instead of compiling.
  const binaryPath = (await plugin.getClientSettings()).tool?.binaryPath;
  if (!binaryPath) {
    throw new Error("must have Sysl binary to generate ERD diagram");
  }
  const source = plugin.getDocument(key.docUri)?.getText();
  if (!source) {
    throw new Error("must have Sysl source to generate ERD diagram");
  }
  const modelPath = URI.parse(key.docUri).fsPath;
  const module: any = await new Sysl(binaryPath).protobufModuleFromSource(source, modelPath);

  return { meta: { ...partialMeta, key }, ...(await buildModel(module)) };
}
