import { filter } from "lodash";

// TODO: Import from shared library.
export type ViewModel = {
  meta?: ViewMeta;
};

/** Metadata associated with a view that may be used by the client rendering it. */
export type ViewMeta = {
  key?: ViewKey;
  label?: string;
  kind?: ViewKind;
};

export type ViewKey = {
  docUri: string;
  pluginId: string;
  viewId: string;
};

export type ViewItem = {
  key: ViewKey;
  model: ViewModel;
};

/** The kind of view to use to render a model. */
export type ViewKind = "html" | "diagram";

// TODO: Import from shared library.
export function viewKeyToString(key: any): string {
  let uri = new URL("view:/");
  if (key.docUri) {
    uri = new URL(key.docUri.replace(/^([^:]+:)/, `${uri.protocol.replace(/:$/, "")}+$1`));
  }
  let query = filter([
    key.pluginId && `pluginId=${key.pluginId}`,
    key.viewId && `viewId=${key.viewId}`,
  ]);
  if (query.length) {
    uri.search = "?" + query.join("&");
  }
  return decodeURIComponent(uri.toString());
}

// TODO: Import from shared library.
export function stringToViewKey(str: any): ViewKey {
  const uri = new URL(str);
  const pluginId = uri.searchParams.get("pluginId") || "";
  const viewId = uri.searchParams.get("viewId") || "";
  const docUri = uri;
  docUri.search = "";
  docUri.protocol = docUri.protocol.replace(/^view\+/, "");
  return { docUri: decodeURIComponent(docUri.toString()), pluginId, viewId };
}
