import { Disposable } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  StaticFeature,
  TransportKind,
  ClientCapabilities,
  DocumentSelector,
  ServerCapabilities,
} from "vscode-languageclient/node";
import { TextDocumentChangeEvent } from "vscode-languageserver";
import path from "path";
import { set } from "lodash";
import { views } from "../views";
import { LspPluginClientRouter } from "./lsp_client_router";
import { Document, Events, PluginClient } from "./types";
import { TextDocument as LspTextDocument } from "vscode-languageserver-textdocument";
import { LspPluginConfig } from "./plugin_config";

export interface LspPluginClientConfig {
  inspectPort?: number;
}

// TODO: Store somewhere non-global.
(global as any).actions = [];

/** Converts plugin config of type LspPluginConfig to LanguageClientOptions */
const getLspClientOptions = (config: LspPluginConfig): LanguageClientOptions => {
  if (config.lsp.clientOptions) {
    const { workspaceFolder , debug, logger, throttleDelay, ...configs } = config.lsp.clientOptions;
    // We are getting rid of PluginClientOptions properties that are not accepted by LanguageClientOptions
    // This function should be rewritten to transform these properties into acceptable configs for the Language Client constructor
    return configs;
  }
  return { documentSelector: [{ scheme: "file", language: "sysl" }] }; // default
}

/**
 * Represents the ability to perform actions.
 */
class ActionsFeature implements StaticFeature {
  fillClientCapabilities(capabilities: ClientCapabilities): void {
    set(capabilities, "experimental.actions", { sysl: "yes" });
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialize(c: ServerCapabilities<any>, d: DocumentSelector | undefined): void {
    const actions = c.experimental?.actions ?? [];
    (global as any).actions.push(...actions);
  }
  dispose(): void {}
}

/**
 * Represents the ability to render views.
 */
class ViewFeature implements StaticFeature {
  fillClientCapabilities(capabilities: ClientCapabilities): void {
    set(capabilities, "experimental.view", { sysl: "yes" });
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialize(c: ServerCapabilities<any>, d: DocumentSelector | undefined): void {}
  dispose(): void {}
}

/**
 * Represents the ability to render diagram views.
 */
class DiagramFeature implements StaticFeature {
  fillClientCapabilities(capabilities: ClientCapabilities): void {
    set(capabilities, "experimental.diagram", { sysl: "yes" });
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialize(c: ServerCapabilities<any>, d: DocumentSelector | undefined): void {}
  dispose(): void {}
}

/** Generates diagrams by running {@code sysl transform} with a script. */
export class LspPluginClient implements PluginClient, Disposable {
  public readonly id: string;
  private client: LanguageClient;
  private readonly subscriptions: Disposable[] = [];
  private readonly router: LspPluginClientRouter;

  constructor(
    private readonly pluginConfig: LspPluginConfig,
    private readonly events: Events,
    config?: LspPluginClientConfig
  ) {
    this.id = path.basename(path.dirname(pluginConfig.lsp.scriptPath));
    const name = `Sysl Plugin: ${this.id}`;
    const run = { module: this.scriptPath, transport: TransportKind.ipc };
    const inspectPort = config?.inspectPort ?? 6051;
    const debugOptions = { execArgv: ["--nolazy", `--inspect=${inspectPort}`] };
    const serverOptions: ServerOptions = { run, debug: { ...run, options: debugOptions } };
    const lspClientOptions: LanguageClientOptions = getLspClientOptions(pluginConfig);
    const client = new LanguageClient(this.id, name, serverOptions, lspClientOptions);
    this.client = client;

    client.registerFeature(new ActionsFeature());
    client.registerFeature(new DiagramFeature());
    client.registerFeature(new ViewFeature());

    this.router = new LspPluginClientRouter(views, client);
  }

  async start(): Promise<void> {
    this.subscriptions.push(
      ...(await this.router.start()),
      this.events.onRender(this.render.bind(this))
    );
  }

  async stop(): Promise<void> {
    await this.client.stop();
    this.subscriptions.forEach((s) => s.dispose());
  }

  async render(doc: Document): Promise<void> {
    const payload: TextDocumentChangeEvent<LspTextDocument> = {
      document: { ...doc, uri: doc.uri.toString() },
    };
    this.client.sendNotification("textDocument/render", payload);
  }

  dispose(): void {
    this.subscriptions.forEach((s) => s.dispose());
    this.router.dispose();
  }

  public get scriptPath(): string {
    return this.pluginConfig.lsp.scriptPath;
  }
}
