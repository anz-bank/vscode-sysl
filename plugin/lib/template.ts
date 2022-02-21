import {
  createConnection,
  Connection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  ClientCapabilities,
  CompletionItem,
  PublishDiagnosticsParams,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  TextDocumentChangeEvent,
  TextDocumentWillSaveEvent,
  InitializeResult,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  TextDocumentRenderNotification,
  ViewEditNotification,
  ViewItem,
  ViewManager,
  ViewManagerConfiguration,
  ViewOpenNotification,
} from "./views";
import { ViewKey } from "@anz-bank/vscode-sysl-model";
import { ViewEdits } from "./views";
import { merge, throttle } from "lodash";

export interface PluginConfig {
  initialization?: Initialization;
  docManagement?: DocumentManagement<TextDocument>;
  autocompletion?: Autocompletion;
  validation?: Validation;
  rendering?: Rendering;
  settings?: Settings;
}

export interface Initialization {
  /** Overrides default onInitialize if provided. */
  onInitialize?: (params: InitializeParams) => InitializeResult;
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

export interface Autocompletion {
  onCompletion?: (pos: TextDocumentPositionParams) => CompletionItem[];
  onCompletionResolve?: (item: CompletionItem) => CompletionItem;
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

  onTextRender?: (e: TextDocumentChangeEvent<TextDocument>) => Promise<RenderResult | undefined>;
  onTextChange?: (e: TextDocumentChangeEvent<TextDocument>) => Promise<RenderResult | undefined>;
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
  private readonly documentSettings: Map<string, Thenable<SyslSettings>> = new Map();
  private readonly defaultSettings: SyslSettings;
  public connection?: Connection;
  public clientCapabilities?: ClientCapabilities;
  public clientSettings?: SyslSettings;
  public readonly viewManager: ViewManager<any> | undefined;

  constructor(private readonly config: PluginConfig) {
    this.defaultSettings = config.settings?.defaults ?? builtinDefaultSettings;

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
    connection.onInitialize((params: InitializeParams) => {
      const result: InitializeResult = {
        capabilities: {
          textDocumentSync: TextDocumentSyncKind.Incremental,
          workspace: { workspaceFolders: { supported: true } },
          completionProvider: this.config.autocompletion && { resolveProvider: true },
        },
      };

      this.clientCapabilities = params.capabilities;
      const customResult = this.config.initialization?.onInitialize?.(params);
      return merge(result, customResult);
    });

    // Settings
    connection.onInitialized(() => {
      connection.workspace.getConfiguration({ section: "sysl" }).then((settings: SyslSettings) => {
        this.clientSettings = settings;
      });
    });

    // Document management
    const dm = this.config.docManagement;
    if (dm) {
      const keys = ["onDidChangeContent", "onDidOpen", "onDidClose", "onDidSave", "onWillSave"];
      keys.forEach((k) => dm[k] && this.documents[k](throttle(dm[k], dm.throttleDelay ?? 500)));
    }

    // Rendering
    const r = this.config.rendering;
    if (r) {
      // Unpacks a rendering result and sends notifications to the client.
      const notify = (result: RenderResult | undefined): void => {
        if (!result) {
          return;
        }
        const send = connection.sendNotification;
        result.open?.length && send(ViewOpenNotification.type, { views: result.open });
        result.edit?.size && send(ViewEditNotification.type, { edits: result.edit.entries() });
      };

      r.onTextChange &&
        this.documents.onDidChangeContent(
          throttle((e) => {
            console.log("handling change");
            r.onTextChange?.(e).then(notify);
          }, r.throttleDelay ?? 500)
        );
      r.onTextRender &&
        connection.onNotification(
          TextDocumentRenderNotification.type,
          throttle((e) => r.onTextRender?.(e).then(notify), r.throttleDelay ?? 500)
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
    }

    // Autocompletion
    const ac = this.config.autocompletion;
    if (ac) {
      ac.onCompletion && connection.onCompletion(ac.onCompletion);
      ac.onCompletionResolve && connection.onCompletionResolve(ac.onCompletionResolve);
    }

    this.documents.listen(connection);
    connection.listen();
    return connection;
  }

  /**
   * Returns the stored details about a document identified by {@code uri}.
   */
  getDocument(uri: string): TextDocument | undefined {
    return this.documents.get(uri);
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
