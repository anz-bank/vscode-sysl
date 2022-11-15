import { Disposable, ViewKey } from "@anz-bank/vscode-sysl-model";
import { ViewModel } from "@anz-bank/vscode-sysl-plugin";
import { omit, throttle } from "lodash";
import path from "path";
import { window } from "vscode";
import { output, syslExt } from "../constants";
import {
  Document,
  DocumentChangeEvent,
  Events,
  PluginClient,
  PluginClientOptions,
} from "../plugins/types";
import { Change, Context, Request, Response } from "../protocol/plugin";
import { spawnBuffer } from "../tools/spawn";
import { Sysl } from "../tools/sysl";
import { views } from "../views";
import { ViewModelChangeEvent } from "../views/events";

/** Details about how to invoke the plugin. */
export type RunOptions = {
  command: string;
  args?: string[];
};

/** Connects to and communicates with a plugin. */
export class CommandPluginClient implements PluginClient {
  private readonly subscriptions: Disposable[] = [];

  constructor(
    public readonly id: string,
    protected readonly sysl: Sysl,
    private readonly runOptions: RunOptions,
    private readonly events: Events,
    private readonly _clientOptions: PluginClientOptions = {}
  ) {}

  /**
   * Initializes the plugin client for communication with the plugin.
   */
  async start(): Promise<void> {
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
    this.subscriptions.forEach((s) => s.dispose());
  }

  /** Notifies the plugin of a change to some source and re-renders results. */
  async onDidChangeTextDocument(e: DocumentChangeEvent): Promise<void> {
    if (path.extname(e.document.uri.fsPath) !== syslExt) {
      return;
    }
    if (!views.getMultiViews(e.document.uri)?.length) {
      return;
    }

    await this.process(e.document, "MODIFY", "TEXT", false);
  }

  /** Notifies the plugin of a save to some source and re-renders results. */
  async onDidSaveTextDocument(e: DocumentChangeEvent): Promise<void> {
    if (path.extname(e.document.uri.fsPath) !== syslExt) {
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
    if (path.extname(doc.uri.fsPath) !== syslExt) {
      return;
    }

    try {
      await this.process(doc, "SAVE_FILE", "TEXT", true);
    } catch (e) {
      window.showErrorMessage(`Plugin ${this.id}: ${e}`);
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

    output.appendLine(`Calling ${this.id} with ${JSON.stringify(truncated(request))}`);

    const response = await spawnBuffer(command, args, options);
    if (!response) {
      throw new Error("No response");
    }
    const responseObject = JSON.parse(response.toString());

    if (responseObject.error) {
      throw new Error(`Response: ${responseObject.error.message}`);
    } else {
      output.appendLine(
        `Command plugin ${this.id} call successful: ${Object.keys(responseObject).join(", ")}`
      );
    }

    return responseObject;
  }

  public get clientOptions(): PluginClientOptions {
    return this._clientOptions;
  }
}

/** Returns a shallowish copy of {@code request} with the large context properties truncated. */
function truncated(request: Request): Request {
  const out: Request = {};
  if (request.initialize) {
    out.initialize = request.initialize;
  } else if (request.onchange) {
    out.onchange = {
      change: request.onchange?.change,
      context: {
        ...omit(request.onchange?.context, "fileContent", "module"),
        fileContent: `<${request.onchange?.context?.fileContent?.length} B>`,
        module: `<${request.onchange?.context?.module?.length} B>`,
      },
    };
  }
  return out;
}
