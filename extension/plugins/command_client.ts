import { throttle, truncate } from "lodash";
import path from "path";
import {
  Document,
  DocumentChangeEvent,
  Events,
  PluginClient,
  PluginClientOptions,
} from "../plugins/types";
import { Change, Context, Request, Response } from "../protocol/plugin";
import { ViewKey } from "../views/key";
import { Disposable, ViewModel } from "../views/types";
import { views } from "../views";
import { Sysl } from "../tools/sysl";
import { spawnBuffer } from "../tools/spawn";
import { ViewModelChangeEvent } from "../views/events";
import { defaultLogger, Logger } from "../tools/logging";

/** Details about how to invoke the plugin. */
export type RunOptions = {
  command: string;
  args?: string[];
};

/** Connects to and communicates with a plugin. */
export class CommandPluginClient implements PluginClient {
  private readonly subscriptions: Disposable[] = [];

  private logger: Logger;

  constructor(
    public readonly id: string,
    protected readonly sysl: Sysl,
    private readonly runOptions: RunOptions,
    private readonly events: Events,
    private readonly _clientOptions: PluginClientOptions = {}
  ) {
    this.logger = _clientOptions.logger ?? defaultLogger;
  }

  /**
   * Initializes the plugin client for communication with the plugin.
   */
  async start(): Promise<void> {
    console.log("starting plugin", this.id);
    const throttled = (f: any) => throttle(f.bind(this), this.clientOptions?.throttleDelay ?? 500);
    this.subscriptions.push(
      this.events.onRender((doc) => this.render(doc)),
      this.events.onDidChangeTextDocument(throttled(this.onDidChangeTextDocument)),
      this.events.onDidSaveTextDocument(throttled(this.onDidSaveTextDocument)),
      views.onDidChangeView(throttled(this.onDidChangeDiagram))
    );

    await this.initialize();
  }

  protected async initialize(): Promise<void> {
    await this.callPlugin({ initialize: {} });
  }

  /**
   * Shuts down the plugin client, disconnecting from the plugin.
   */
  async stop(): Promise<void> {
    console.log("stopping plugin", this.id);
    this.subscriptions.forEach((s) => s.dispose());
  }

  /** Notifies the plugin of a change to some source and re-renders results. */
  async onDidChangeTextDocument(e: DocumentChangeEvent): Promise<void> {
    if (path.extname(e.document.uri.fsPath) !== ".sysl") {
      return;
    }
    if (!views.getMultiViews(e.document.uri)?.length) {
      return;
    }

    await this.process(e.document, "MODIFY", "TEXT", false);
  }

  /** Notifies the plugin of a save to some source and re-renders results. */
  async onDidSaveTextDocument(e: DocumentChangeEvent): Promise<void> {
    if (path.extname(e.document.uri.fsPath) !== ".sysl") {
      return;
    }
    if (!views.getMultiViews(e.document.uri)?.length) {
      return;
    }

    await this.process(e.document, "SAVE_FILE", "TEXT", false);
  }

  /** Notifies the plugin of a change to the diagram and re-renders results. */
  async onDidChangeDiagram(e: ViewModelChangeEvent<any, any>): Promise<void> {
    if (e.document && e.key.pluginId === this.id) {
      await this.process(e.document, "MODIFY", "DIAGRAM", false, {
        model: e.model,
        delta: e.change,
      });
    }
  }

  /**
   * Renders views for the document.
   */
  async render(doc: Document): Promise<void> {
    if (path.extname(doc.uri.fsPath) !== ".sysl") {
      return;
    }

    try {
      await this.process(doc, "SAVE_FILE", "TEXT", true);
    } catch (e) {
      console.error(`error rendering command plugin ${this.id}`, e);
    }
  }

  /**
   * Handles the details of building a valid request, calling the plugin, and handling the response.
   */
  protected async process(
    doc: Document,
    action: Change["action"],
    source: Change["source"],
    openIfNot: boolean = false,
    detail?: any
  ): Promise<void> {
    console.log(`command: processing ${source} ${action} on ${doc.uri.fsPath}`);
    const req = await this.buildRequest(doc, action, source, detail);
    await this.callAndHandle(req, doc, openIfNot);
  }

  private async buildRequest(
    doc: Document,
    action: Change["action"],
    source: Change["source"],
    detail?: any
  ): Promise<Request> {
    return {
      onchange: {
        change: {
          filePath: doc.uri.fsPath,
          action,
          source,
          detail,
        },
        context: await this.buildContext(doc),
      },
    };
  }

  private async buildContext(doc: Document): Promise<Context> {
    const fileContent = doc.getText();
    const moduleBuffer = await this.sysl.protobufFromSource(fileContent, doc.uri.fsPath, "pb");
    return {
      filePath: doc.uri.fsPath,
      fileContent,
      syslRoot: this._clientOptions.workspaceFolder,
      module: moduleBuffer.toString("base64"),
    };
  }

  private async callAndHandle(req: Request, doc: Document, openIfNot: boolean): Promise<void> {
    const res = await this.callPlugin(req);
    await this.handleResponse(res, doc, openIfNot);
  }

  protected async handleResponse(res: Response, doc: Document, openIfNot: boolean): Promise<void> {
    const diagrams = res.onchange?.renderDiagram || [];
    await Promise.all(
      diagrams.map(async (d, i) => {
        // TODO: Not necessarily true in general.
        const kind = "diagram";
        const label = d.content?.templates?.diagramLabel || this.id;
        const key: ViewKey = {
          docUri: doc.uri.toString(),
          pluginId: this.id,
          viewId: d.type?.id || label || i.toString(),
        };
        const model: ViewModel = { ...d.content, meta: { key, kind, label } };

        if (views.getViews(key)?.length) {
          await views.applyEdit([[key, [{ model }]]]);
        } else if (openIfNot) {
          await views.openView(key, model);
        }
      })
    );
  }

  /**
   * Sends a request to the plugin, and return the response when it arrives.
   */
  private async callPlugin(request: Request): Promise<Response> {
    const { command, args } = this.runOptions;
    const options = { input: JSON.stringify(request) };

    const optionsStr = { ...options, input: truncate(options.input?.toString()) };
    this.logger.log("command spawn:", command, ...(args ?? []), optionsStr);

    const response = await spawnBuffer(command, args, options);

    if (!response) {
      throw new Error("no response");
    }

    const responseObject = JSON.parse(response.toString());

    if (responseObject.error) {
      this.logger.log("command error:",responseObject.error);
      throw new Error("Response received with error");
    } else {
      this.logger.log("command complete:", command, ...(args ?? []), truncate(response.toString()));
    }

    return responseObject;
  }

  public get clientOptions(): PluginClientOptions {
    return this._clientOptions;
  }
}
