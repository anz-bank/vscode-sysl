/**
 * Defines the set of model-related messages that can pass between plugin client and server, as
 * notifications or requests/responses, and functions to produce them.
 */

import { Model } from "@anz-bank/sysl/model";
import { PbDocumentModel } from "@anz-bank/sysl/pbModel";
import { isString, pull } from "lodash";
import { Connection, URI } from "vscode-languageserver";
import { Disposable, ProtocolNotificationType } from "vscode-languageserver/node";

// MODELS

// TODO: Implement.
type ModelDelta = any;

export interface ModelManagerConfiguration<K, T, D extends ModelDelta> {
  create(key: K, model: T): T;
  update(model: T, changes: D[]): T;
}

export const defaultModelManagerConfig: ModelManagerConfiguration<string, Model, ModelDelta> = {
  create(key: string, value: string | Model): Model {
    let model: Model;
    // TODO: model should be a Model, not a string.
    if (isString(value)) {
      model = PbDocumentModel.fromJson(value).toModel();
    } else {
      model = value;
    }
    return model;
  },

  update(model: Model, changes: ModelDelta[]): Model {
    // TODO: Do incremental deltas and update.
    return PbDocumentModel.fromJson(changes[0]!).toModel();
  },
};

/**
 * Manages a set of models to keep track of their state in the client.
 */
export class ModelManager<T> {
  /** The models being actively managed. Each key is the URI of the model's document. */
  private readonly _models: { [key: URI]: T } = {};

  /** Callbacks to invoke when a model changes. */
  private readonly _changeListeners: ((model: T, uri: URI) => any)[] = [];

  constructor(private readonly configuration: ModelManagerConfiguration<string, T, any>) {}

  /**
   * Returns the model for the given URI or key. Returns undefined if
   * the model is not managed by this instance.
   *
   * @param uri The text document's URI to retrieve.
   * @return the text document or `undefined`.
   */
  public get(uri: URI): T | undefined {
    return this._models[uri];
  }

  /**
   * Returns all models managed by this instance.
   */
  public all(): T[] {
    return Object.values(this._models);
  }

  /**
   * Returns the URIs of all models managed by this instance.
   */
  public keys(): string[] {
    return Object.keys(this._models);
  }

  /**
   * Listens for `low level` notification on the given connection to update the
   * models managed by this instance.
   *
   * @param connection The connection to listen on.
   */
  listen(connection: Connection): void {
    connection.onNotification(ModelDidOpenNotification.type, (event: ModelDidOpenParams) => {
      const { key, model } = event;
      this._models[key] = this.configuration.create(key, model as any);
      this._changeListeners.forEach((fn) => fn(this._models[key], key));
    });

    connection.onNotification(ModelDidChangeNotification.type, (event: ModelDidChangeParams) => {
      const uri = event.key;
      this._models[uri] = this.configuration.update(this._models[uri], event.modelChanges);
      this._changeListeners.forEach((fn) => fn(this._models[uri], uri));
    });

    connection.onNotification(ModelDidCloseNotification.type, (event: ModelDidCloseParams) => {
      delete this._models[event.key];
    });
  }

  onDidChange(listener: (model: T, uri: string) => any): Disposable {
    this._changeListeners.push(listener);
    return { dispose: () => pull(this._changeListeners, listener) };
  }
}

// CAPABILITIES

/** The set of model-related capabilities that the client may support. */
export interface ModelClientCapabilities {}

// NOTIFICATIONS

// - Model Did Open

/**
 * The model did open notification is sent from a client to a server to signal
 * newly opened models. The model's truth is now managed by the client and the
 * server must not try to read the model's content from any other source.
 */
export namespace ModelDidOpenNotification {
  export const type = new ProtocolNotificationType<ModelDidOpenParams, void>("model/didOpen");
}

/**
 * The parameters of a model open notification.
 */
export interface ModelDidOpenParams {
  /**
   * The key of the model that was opened.
   */
  key: string;

  /**
   * The details of the model that was opened.
   */
  model: string;
}

// - Model Did Close

/**
 * The model did close notification is sent from a client to a server to signal
 * newly closed models.
 */
export namespace ModelDidCloseNotification {
  export const type = new ProtocolNotificationType<ModelDidCloseParams, void>("model/didClose");
}

/**
 * The parameters of a model close notification.
 */
export interface ModelDidCloseParams {
  /**
   * The key of the model that was closed.
   */
  key: string;
}

// - Model Did Change

/**
 * The model did change notification is sent from a client to a server to signal
 * changes to a model.
 */
export namespace ModelDidChangeNotification {
  export const type = new ProtocolNotificationType<ModelDidChangeParams, void>("model/didChange");
}

/**
 * The parameters of a model did change notification.
 */
export interface ModelDidChangeParams {
  /**
   * The key of the model that was changed.
   */
  key: string;

  /**
   * The changes that occurred in the model's model.
   */
  modelChanges: string[];
}
