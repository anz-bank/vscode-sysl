import { Model } from "@anz-bank/sysl/model";
import { ViewKey } from "@anz-bank/vscode-sysl-model";
import { merge, throttle } from "lodash";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  ClientCapabilities,
  CodeLens,
  CodeLensParams,
  CompletionItem,
  Connection,
  createConnection,
  InitializeParams,
  InitializeResult,
  ProposedFeatures,
  PublishDiagnosticsParams,
  TextDocumentChangeEvent,
  TextDocumentPositionParams,
  TextDocuments,
  TextDocumentSyncKind,
  TextDocumentWillSaveEvent,
  URI,
} from "vscode-languageserver/node";
import { ModelManager, ModelManagerConfiguration } from "./models";
import {
  TextDocumentRenderNotification,
  ViewEditNotification,
  ViewEdits,
  ViewItem,
  ViewManager,
  ViewManagerConfiguration,
  ViewOpenNotification,
} from "./views";

export interface PluginConfig {
  initialization?: Initialization;
  docManagement?: DocumentManagement<TextDocument>;
  modelManagement?: ModelManagement<any>;
  autocompletion?: Autocompletion;
  codelens?: CodeLensConfig;
  validation?: Validation;
  rendering?: Rendering;
  settings?: Settings;
}

export interface Initialization {
  /**
   * Returns an {@link InitializeResult} that is merged into the default {@link InitializeResult},
   * overwriting values with the same paths.
   *
   * Invoked before the connection is initialized, so some functions (e.g.
   * {@link Plugin.getClientSettings} are not yet available. If they're needed, for one-off plugin
   * setup, they should be chained after {@link Connection.onInitialized}.
   */
  onInitialize?: (params: InitializeParams) => Promise<InitializeResult>;
}

export interface DocumentManagement<T> {
  /** Minimum time (in ms) to wait between callbacks of the same kind. Default 500. */
  throttleDelay?: number;

  onDidChangeContent?: (e: TextDocumentChangeEvent<T>) => void;
  onDidOpen?: (e: TextDocumentChangeEvent<T>) => void;
  onDidClose?: (e: TextDocumentChangeEvent<T>) => void;
  onDidSave?: (e: TextDocumentChangeEvent<T>) => void;
  onWillSave?: (e: TextDocumentWillSaveEvent<T>) => void;
}

export interface ModelManagement<T> {
  /** Configuration for the model manager. */
  modelManagerConfig?: ModelManagerConfiguration<string, T, any>;
  /** Minimum time (in ms) to wait between callbacks of the same kind. Default 500. */
  throttleDelay?: number;

  onDidChangeContent?: (e: TextDocumentChangeEvent<T>) => void;
  onDidOpen?: (e: TextDocumentChangeEvent<T>) => void;
  onDidClose?: (e: TextDocumentChangeEvent<T>) => void;
}

export interface Autocompletion {
  onCompletion?: (pos: TextDocumentPositionParams) => Promise<CompletionItem[]>;
  onCompletionResolve?: (item: CompletionItem) => Promise<CompletionItem>;
}

export interface CodeLensConfig {
  /**
   * Returns a collection of CodeLenses to be displayed.
   *
   * This call should return as fast as possible. If computing the commands is expensive, return
   * only CodeLens objects with the range set and handle {@link onResolve}.
   */
  onProvide?: (params: CodeLensParams) => Promise<CodeLens[]>;

  /** Returns more details of a CodeLens that was too expensive to compute in {@link onProvide}. */
  onResolve?: (lens: CodeLens) => Promise<CodeLens>;

  /** Handles the activation of a CodeLens by invoking a command. */
}

/**
 * Configures a language validation feature.
 *
 * If defined, {@link onValidate} is invoked to perform validation. It is expected to use methods of
 * the plugin such as {@code sendDiagnostics} to publish its validation results.
 *
 * By default, validation is invoked on every file change and save. For more precise control over
 * validation logic, these can be skipped by setting {@link skipOnChange} and {@link skipOnSave} to
 * {@code true} (default is {@code false}).
 */
export interface Validation {
  skipOnChange?: boolean;
  skipOnSave?: boolean;
  skipOnModelChange?: boolean;
  onValidate?: (doc: TextDocument) => Promise<PublishDiagnosticsParams | void>;
}

/** Configures the behavior of the plugin's settings management. */
export interface Settings {
  /** If defined, this overrides the built-in default settings. */
  defaults?: SyslSettings;
}

/**
 * The configuration settings contributed by the Sysl extension.
 */
export interface SyslSettings {
  tool?: {
    binaryPath?: string;
  };
}

export type DiagramContent = {
  nodes: any[];
  edges: any[];
};

export type HtmlContent = {
  html: string;
};

/** Rendering actions to perform in response to client changes. */
export type RenderResult = {
  open?: ViewItem[];
  edit?: ViewEdits;
};

export interface Rendering {
  /** Configuration for the view manager. */
  viewManagerConfig?: ViewManagerConfiguration<ViewKey, ViewItem, any, any>;
  /** Minimum time (in ms) to wait between callbacks of the same kind. Default 500. */
  throttleDelay?: number;

  onDidOpen?: (e: TextDocumentChangeEvent<TextDocument>) => Promise<RenderResult | undefined>;
  onTextRender?: (e: TextDocumentChangeEvent<TextDocument>) => Promise<RenderResult | undefined>;
  onTextChange?: (e: TextDocumentChangeEvent<TextDocument>) => Promise<RenderResult | undefined>;
  onModelChange?: (model: Model, uri: URI) => Promise<RenderResult | undefined>;
}

/**
 * The settings to use if they can't be fetched or are undefined on the client. These generally
 * shouldn't be necessary.
 */
const builtinDefaultSettings: SyslSettings = {
  tool: { binaryPath: undefined },
};

export class Plugin {
  private readonly documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
  private readonly documentSettings: Map<string, Promise<SyslSettings>> = new Map();
  private readonly defaultSettings: SyslSettings;
  public connection?: Connection;
  public clientCapabilities?: ClientCapabilities;
  public readonly modelManager: ModelManager<Model> | undefined;
  public readonly viewManager: ViewManager<any> | undefined;

  private hasConfigurationCapability: boolean = false;

  constructor(private readonly config: PluginConfig) {
    this.defaultSettings = config.settings?.defaults ?? builtinDefaultSettings;

    const modelManagerConfig = this.config.modelManagement?.modelManagerConfig;
    if (modelManagerConfig) {
      this.modelManager = new ModelManager<Model>(modelManagerConfig);
    }
    const viewManagerConfig = this.config.rendering?.viewManagerConfig;
    if (viewManagerConfig) {
      this.viewManager = new ViewManager(viewManagerConfig);
    }
  }

  /** Creates the connection for the extension. */
  createConnection(): Connection {
    const connection = createConnection(ProposedFeatures.all);
    this.connection = connection;

    // Initialization
    connection.onInitialize(async (params: InitializeParams) => {
      const result: InitializeResult = {
        capabilities: {
          textDocumentSync: TextDocumentSyncKind.Incremental,
          workspace: { workspaceFolders: { supported: true } },
          completionProvider: this.config.autocompletion && { resolveProvider: true },
          codeLensProvider: this.config.codelens && { resolveProvider: true },
        },
      };

      // Does the client support the `workspace/configuration` request?
      // If not, we fall back using global settings.
      this.hasConfigurationCapability = !!params.capabilities?.workspace?.configuration;

      this.clientCapabilities = params.capabilities;
      const customResult = await this.config.initialization?.onInitialize?.(params);
      return merge(result, customResult);
    });

    // Document management
    const dm = this.config.docManagement;
    if (dm) {
      const delay = dm.throttleDelay ?? 500;
      dm.onDidChangeContent &&
        this.documents.onDidChangeContent(throttle(dm.onDidChangeContent, delay));
      dm.onDidOpen && this.documents.onDidOpen(throttle(dm.onDidOpen, delay));
      dm.onDidClose && this.documents.onDidClose(throttle(dm.onDidClose, delay));
      dm.onDidSave && this.documents.onDidSave(throttle(dm.onDidSave, delay));
      dm.onWillSave && this.documents.onWillSave(throttle(dm.onWillSave, delay));
    }

    // Model management
    this.modelManager?.listen(connection);

    // Rendering
    const r = this.config.rendering;
    if (r) {
      const delay = r.throttleDelay ?? 500;
      // Unpacks a rendering result and sends notifications to the client.
      const notify = (result: RenderResult | undefined): void => {
        if (!result) {
          return;
        }
        const send = connection.sendNotification;
        result.open?.length && send(ViewOpenNotification.type, { views: result.open });
        result.edit?.size && send(ViewEditNotification.type, { edits: result.edit.entries() });
      };

      r.onDidOpen &&
        this.documents.onDidOpen(throttle((e) => r.onDidOpen?.(e).then(notify), delay));
      r.onTextChange &&
        this.documents.onDidChangeContent(throttle((e) => r.onTextChange?.(e).then(notify), delay));
      r.onModelChange &&
        this.modelManager?.onDidChange(
          throttle((model, uri) => r.onModelChange?.(model, uri).then(notify), delay)
        );
      r.onTextRender &&
        connection.onNotification(
          TextDocumentRenderNotification.type,
          throttle((e) => r.onTextRender?.(e).then(notify), delay)
        );

      this.viewManager?.listen(connection);
    }

    // Validation
    const v = this.config.validation;
    const onValidate = v?.onValidate;
    if (v && onValidate) {
      const handle = async (change: TextDocumentChangeEvent<TextDocument>) => {
        const result = await onValidate(change.document);
        result && connection.sendDiagnostics(result);
      };
      v.skipOnChange || this.documents.onDidChangeContent(handle);
      v.skipOnSave || this.documents.onDidSave(handle);

      v.skipOnModelChange ||
        this.modelManager?.onDidChange(async (model: Model, uri: string) => {
          const doc = this.documents.get(uri);
          const result = doc && (await onValidate(doc));
          result && connection.sendDiagnostics(result);
        });
    }

    // Autocompletion
    const ac = this.config.autocompletion;
    if (ac) {
      ac.onCompletion && connection.onCompletion(ac.onCompletion);
      ac.onCompletionResolve && connection.onCompletionResolve(ac.onCompletionResolve);
    }

    // CodeLens
    const cl = this.config.codelens;
    if (cl) {
      cl.onProvide && connection.onCodeLens(cl.onProvide);
      cl.onResolve && connection.onCodeLensResolve(cl.onResolve);
      connection.onCodeAction;
    }

    this.documents.listen(connection);
    connection.listen();
    return connection;
  }

  /**
   * Returns the Sysl settings configured on the client.
   */
  async getClientSettings(): Promise<SyslSettings> {
    if (!this.hasConfigurationCapability) {
      return builtinDefaultSettings;
    }
    const conn = this.connection;
    if (!conn) {
      throw new Error("no connection");
    }
    return new Promise(function (resolve, reject) {
      conn.onInitialized(async () => {
        conn.workspace.getConfiguration({ section: "sysl" }).then(resolve).catch(reject);
      });
    });
  }

  /**
   * Returns the stored details about a document identified by {@code uri}.
   */
  getDocument(uri: string): TextDocument | undefined {
    return this.documents.get(uri);
  }

  /**
   * Returns the stored model of a document identified by {@code uri}.
   */
  getModel(uri: string): Model | undefined {
    return this.modelManager?.get(uri);
  }

  /**
   * Fetches settings for the given document resource.
   * @param resource The URI of the document to fetch settings for.
   * @returns The document settings if they could be determined, or the default settings otherwise.
   */
  async getDocumentSettings(resource: string): Promise<SyslSettings> {
    let result = this.documentSettings.get(resource);
    if (result != null) {
      return result;
    }

    if (!this.connection) {
      return this.defaultSettings;
    }

    try {
      result = this.connection.workspace.getConfiguration({
        scopeUri: resource,
        section: "sysl",
      });
      if (!result) {
        throw new Error("no config");
      }
      this.documentSettings.set(resource, result);
      return result;
    } catch (e) {
      console.error(`failed to get document settings for ${resource}`, e);
      return this.defaultSettings;
    }
  }

  /** Resets all cached document settings. Subsequent requests will fetch the current values. */
  resetSettings(): void {
    this.documentSettings.clear();
  }
}
