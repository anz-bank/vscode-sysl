import { filter } from "lodash";
import { URI } from "vscode-uri";

/** A composite key identifying a particular view. */
export type ViewKey = {
  /** Location of the document that the view represents. */
  docUri: string;

  /** An ID string that is globally unique among plugins. */
  pluginId: string;

  /** An ID string that is globally unique among views belonging to the plugin. */
  viewId: string;
};

/**
 * Serializes a view key to a URI-compatible string.
 *
 * The base of the URI is that of the source document. If present, the document's scheme is replaced
 * with {@code view+<doc scheme>}. If the {@code pluginId} and/or {@code viewId} are present, they
 * are appended as query params.
 */
export function viewKeyToString(key: ViewKey): string {
  let uri = URI.parse("view:/");
  if (key.docUri) {
    const docUri = URI.parse(key.docUri);
    uri = docUri.with({ scheme: `${uri.scheme}+${docUri.scheme}` });
  }
  let query = filter([
    key.pluginId && `pluginId=${key.pluginId}`,
    key.viewId && `viewId=${key.viewId}`,
  ]);
  if (query.length) {
    uri = uri.with({ query: query.join("&") });
  }
  return decodeURIComponent(uri.toString());
}

/** Deserializes a ViewKey URI into a ViewKey. */
export function uriToViewKey(uri: URI): ViewKey {
  const docUri = uri
    .with({ scheme: uri.scheme.replace(/^view\+/, ""), fragment: null, query: null })
    .toString();
  const query = decodeURIComponent(uri.query);
  return {
    docUri: decodeURIComponent(docUri),
    pluginId: query.match(/pluginId=(\w+)/)?.[1] || "",
    viewId: query.match(/viewId=(\w+)/)?.[1] || "",
  };
}
