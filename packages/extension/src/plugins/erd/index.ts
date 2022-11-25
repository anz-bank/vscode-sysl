import { Model } from "@anz-bank/sysl/model";
import { ViewKey } from "@anz-bank/vscode-sysl-model";
import {
  defaultModelManagerConfig,
  defaultViewManagerConfig,
  Plugin,
  RenderResult,
  ViewEdits,
  ViewMeta,
} from "@anz-bank/vscode-sysl-plugin";
import { TextDocumentChangeEvent, URI } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Sysl } from "../../tools/sysl";
import { DiagramModel } from "../../views/diagram/model";
import { buildModel } from "./diagram";

const plugin = new Plugin({
  rendering: {
    viewManagerConfig: defaultViewManagerConfig,
    onTextRender,
    onModelChange,
  },
  modelManagement: {
    modelManagerConfig: defaultModelManagerConfig,
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

async function onModelChange(model: Model, docUri: URI): Promise<RenderResult | undefined> {
  const key: ViewKey = { ...partialKey, docUri };
  if (plugin.viewManager?.get(key)) {
    return { edit: new ViewEdits().set(key, await buildModelForKey(key)) };
  }
}

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

/** Returns a model for the ERD diagram. */
async function buildModelForKey(key: ViewKey): Promise<DiagramModel> {
  const model = plugin.getModel(key.docUri);
  if (!model) {
    throw new Error("must have compiled model to render ERD diagram");
  }

  return { meta: { ...partialMeta, key }, ...(await buildModel(model, key.docUri)) };
}
