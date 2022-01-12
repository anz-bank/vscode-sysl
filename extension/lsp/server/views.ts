/**
 * Defines the set of view-related messages that can pass between plugin client and server, as
 * notifications or requests/responses, and functions to produce them.
 */

import { Connection, TextDocumentChangeEvent, TextDocuments } from "vscode-languageserver";
import { ProtocolNotificationType } from "vscode-languageserver-protocol";
import { TextDocument } from "vscode-languageserver-textdocument";
import { ViewEdit } from "../../views/edits";
import { ViewKey, viewKeyToString } from "../../views/key";
import { ViewModel, ViewModelDelta } from "../../views/types";
import { ViewMeta } from "../../views/types";

// MODELS

/** A unique descriptor of a particular view. */
// export type ViewUri = string;

export type ViewItem<K = ViewKey, T = ViewModel> = {
  key: K;
  model?: T;
  visible?: boolean;
};

export interface ViewManagerConfiguration<K, V, T extends ViewModel, D extends ViewModelDelta> {
  create(key: K, model: T): V;
  update(view: V, changes: D[]): V;
}

export const defaultViewManagerConfig: ViewManagerConfiguration<ViewKey, ViewItem, any, any> = {
  create(key: ViewKey, model: any): ViewItem {
    return { key, model };
  },
  update(view: ViewItem, changes: any[]): ViewItem {
    // TODO: Apply update.
    return view;
  },
};

/**
 * Manages a set of views to keep track of their state in the client.
 */
export class ViewManager<T extends { visible?: boolean }> {
  /** The views being actively managed. Each key is a {@link ViewKey} serialized to a string. */
  private readonly _views: { [key: string]: T } = {};

  constructor(private readonly configuration: ViewManagerConfiguration<ViewKey, T, any, any>) {}

  /**
   * Returns the view for the given URI or key. Returns undefined if
   * the view is not managed by this instance.
   *
   * @param uri The text document's URI to retrieve.
   * @return the text document or `undefined`.
   */
  public get(key: ViewKey): T | undefined {
    return this._views[viewKeyToString(key)];
  }

  /**
   * Returns all views managed by this instance.
   */
  public all(): T[] {
    return Object.values(this._views);
  }

  /**
   * Returns the URIs of all views managed by this instance.
   */
  public keys(): string[] {
    return Object.keys(this._views);
  }

  /**
   * Listens for `low level` notification on the given connection to update the
   * views managed by this instance.
   *
   * @param connection The connection to listen on.
   */
  listen(connection: Connection): void {
    connection.onNotification(ViewDidOpenNotification.type, (event: ViewDidOpenParams) => {
      console.log("opened", event.view.key);
      const { key, model } = event.view;
      this._views[viewKeyToString(key)] = this.configuration.create(key, model);
    });

    connection.onNotification(ViewDidCloseNotification.type, (event: ViewDidCloseParams) => {
      console.log("closed", event.key);
      delete this._views[viewKeyToString(event.key)];
    });

    connection.onNotification(ViewDidShowNotification.type, (event: ViewDidShowParams) => {
      console.log("showed", event.key);
      const view = this._views[viewKeyToString(event.key)];
      view && (view.visible = true);
    });

    connection.onNotification(ViewDidHideNotification.type, (event: ViewDidHideParams) => {
      console.log("hidden", event.key);
      this._views[viewKeyToString(event.key)].visible = false;
    });

    connection.onNotification(ViewDidChangeNotification.type, (event: ViewDidChangeParams<any>) => {
      const uri = viewKeyToString(event.key);
      this._views[uri] = this.configuration.update(this._views[uri], event.modelChanges);
    });
  }
}

// CAPABILITIES

/** The set of view-related capabilities that the client may support. */
export interface ViewClientCapabilities {}

// NOTIFICATIONS

// - Document Render

/**
 * The text document render notification is sent from a client to a server to request
 * rendering of views relevant for a text document. A ViewOpenNotification may
 * be sent as an asynchronous response.
 */
export namespace TextDocumentRenderNotification {
  export const type = new ProtocolNotificationType<TextDocumentRenderParams, void>(
    "textDocument/render"
  );
}

/**
 * The parameters of a text document render notification.
 */
export interface TextDocumentRenderParams extends TextDocumentChangeEvent<TextDocument> {}

// - View Open

/**
 * The view open notification is sent from a server to a client to ask
 * the client to display a particular view in the user interface.
 */
export namespace ViewOpenNotification {
  export const type = new ProtocolNotificationType<ViewOpenParams, void>("view/open");
}

/**
 * The parameters of a view open notification.
 */
export interface ViewOpenParams {
  /** The views to open. */
  views: ViewItem[];
}

// - View Did Open

/**
 * The view did open notification is sent from a client to a server to signal
 * newly opened views. The view's truth is now managed by the client and the
 * server must not try to read the view's content from any other source.
 */
export namespace ViewDidOpenNotification {
  export const type = new ProtocolNotificationType<ViewDidOpenParams, void>("view/didOpen");
}

/**
 * The parameters of a view open notification.
 */
export interface ViewDidOpenParams {
  /**
   * The details of the view that was opened.
   */
  view: ViewItem;
}

// - View Did Close

/**
 * The view did close notification is sent from a client to a server to signal
 * newly closed views.
 */
export namespace ViewDidCloseNotification {
  export const type = new ProtocolNotificationType<ViewDidCloseParams, void>("view/didClose");
}

/**
 * The parameters of a view close notification.
 */
export interface ViewDidCloseParams {
  /**
   * The key of the view that was closed.
   */
  key: ViewKey;
}

// - View Did Show

/**
 * The view did show notification is sent from a client to a server to signal
 * newly shown views.
 */
export namespace ViewDidShowNotification {
  export const type = new ProtocolNotificationType<ViewDidShowParams, void>("view/didShow");
}

/**
 * The parameters of a view show notification.
 */
export interface ViewDidShowParams {
  /**
   * The key of the view that was shown.
   */
  key: ViewKey;
}

// - View Did hide

/**
 * The view did hide notification is sent from a client to a server to signal
 * newly hidden views.
 */
export namespace ViewDidHideNotification {
  export const type = new ProtocolNotificationType<ViewDidHideParams, void>("view/didHide");
}

/**
 * The parameters of a view hide notification.
 */
export interface ViewDidHideParams {
  /**
   * The key of the view that was hidden.
   */
  key: ViewKey;
}

// - View Edit

/**
 * The view edit notification is sent from a server to a client to ask
 * the client to apply a change to a particular view's model. The client should
 * propagate that change to all affected views that have been rendered.
 *
 * If an affected view has not been rendered, the edit notification is a no-op,
 * unless an edit has {@link ViewEdit.open} set to {@code true}.
 */
export namespace ViewEditNotification {
  export const type = new ProtocolNotificationType<ViewEditParams, void>("view/edit");
}

/**
 * The parameters of a view edit notification.
 */
export interface ViewEditParams {
  /**
   * An optional label for the view edits. This label is presented in the user
   * interface for example on an undo stack to undo the edits.
   */
  label?: string;

  /**
   * The view edits to apply. Each edit entry describes an array of changes to
   * apply to a particular view (based on its key). The client should apply the
   * changes to all instances of the view.
   */
  edits: [ViewKey, ViewEdit[]][];
}

// - View Did Change

/**
 * The view did change notification is sent from a client to a server to signal
 * changes to a view.
 */
export namespace ViewDidChangeNotification {
  export const type = new ProtocolNotificationType<ViewDidChangeParams<any>, void>(
    "view/didChange"
  );
}

/**
 * The parameters of a view did change notification.
 */
export interface ViewDidChangeParams<D> {
  /**
   * The key of the view that was changed.
   */
  key: ViewKey;

  /**
   * The changes that occurred in the view's model.
   */
  modelChanges: D[];
}

export type DiagramType = string;
export interface NodesAndEdges {
  nodes: any[];
  edges: any[];
}

/**
 * Describes a change to a diagram model.
 */
export class DiagramEdit {
  /**
   * Replaces the content of elements of the model at key with the data in model with matching keys.
   *
   * If elements in the new model have keys that don't match elements in the existing model, they
   * are ignored.
   * @param key The view of the view to update.
   * @param model The new model data to update to.
   */
  static replace(key: ViewKey, diagramType: DiagramType, model: NodesAndEdges): DiagramEdit {
    return new DiagramEdit(key, diagramType, null, null, model, false);
  }

  /**
   * Sets the model at key to the given model.
   *
   * This is equivalent to removing everything in the existing model, and inserting everything from
   * the new model, but will be applied as an incremental change.
   * @param key The view of the view to update.
   * @param model The new model data to set on the view.
   */
  static replaceAll(key: ViewKey, diagramType: DiagramType, model: NodesAndEdges): DiagramEdit {
    return new DiagramEdit(key, diagramType, null, null, model, true);
  }

  /**
   * Adds all contents of model to the model at key.
   *
   * If any elements in the new model have the same key as existing elements, they are ignored.
   * @param key The view of the view to update.
   * @param model The new model data to add.
   */
  static add(key: ViewKey, diagramType: DiagramType, model: NodesAndEdges): DiagramEdit {
    return new DiagramEdit(key, diagramType, model, null, null, false);
  }

  /**
   * Removes all content with the given keys from the model at key.
   *
   * If any of the given keys don't exist in the model, they are ignored.
   * @param key The view of the view to update.
   * @param keys The keys of the data to remove, both nodes and edges.
   */
  static remove(key: ViewKey, diagramType: DiagramType, keys: string[]): DiagramEdit {
    return new DiagramEdit(key, diagramType, null, keys, null, false);
  }

  constructor(
    public key: ViewKey,
    public diagramType: string,
    public add: NodesAndEdges | null,
    public remove: string[] | null,
    public replace: NodesAndEdges | null,
    public replaceAll: boolean = false
  ) {}
}
