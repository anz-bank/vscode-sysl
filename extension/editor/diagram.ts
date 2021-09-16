import {
  window,
  workspace,
  Uri,
  ExtensionContext,
  CustomTextEditorProvider,
  Disposable,
  TextDocument,
  WebviewPanel,
  Webview,
  commands,
} from "vscode";
import { CustomEditorCommandMap, customViewType, syslBinaryPath } from "../constants";
import path, { join } from "path";
import { filter, flatten } from "lodash";
import { checkSysl, getOrDownloadSysl } from "../tools/sysl_download";
import { Context, OnChangeResponse } from "../protocol/plugin";
import { Sysl } from "../tools/sysl";
import { PluginClientOptions } from "../protocol/client";
import { panelManager } from "./panel_manager";
import { FileLogger } from "./file_logger";
import { PluginManager } from "../plugins/manager";
import { PluginLocator } from "../plugins/locator";

/**
 * Initializes the interactive diagram web view and handles sending and receiving events.
 */
export class SyslGoJsDiagramEditorProvider implements CustomTextEditorProvider {
  public static register(context: ExtensionContext): Disposable {
    const provider = new SyslGoJsDiagramEditorProvider(context);
    const providerRegistration = window.registerCustomEditorProvider(customViewType, provider);

    const postToActive = (type: string) =>
      panelManager.getActivePanel()?.webview.postMessage({ type });

    const editorCommands: CustomEditorCommandMap = {
      "sysl.diagram.toggleComponentTree": () => postToActive("toggleComponentTree"),
      "sysl.diagram.toggleDescriptionPane": () => postToActive("toggleDescriptionPane"),
    };
    for (let key in editorCommands) {
      context.subscriptions.push(commands.registerCommand(key, editorCommands[key]));
    }

    return providerRegistration;
  }

  static readonly viewType = "sysl.gojsDiagram";

  constructor(private readonly context: ExtensionContext) {}

  /** Initializes a new webview panel for a Sysl spec. */
  public async resolveCustomTextEditor(
    document: TextDocument,
    webviewPanel: WebviewPanel
  ): Promise<void> {
    if (workspace.workspaceFolders?.length != 1) {
      throw new Error("Cannot locate workspace");
    }

    const getPlugins = async () => {
      const workspaceDirs = workspace.workspaceFolders?.map((f) => f.uri.fsPath) ?? [];
      const options: PluginClientOptions = {
        debug: Sysl.isDebugEnabled(),
        logger: new FileLogger(path.join(workspaceDirs[0], "logs")),
      };
      return new PluginManager(
        await PluginLocator.all(sysl, this.context.extensionPath, workspaceDirs, options)
      );
    };

    const filePath = document.uri.fsPath;
    const syslPath = workspace.getConfiguration().get<string>(syslBinaryPath);
    const sysl = syslPath
      ? await checkSysl(syslPath)
      : await getOrDownloadSysl(this.context.globalStorageUri.fsPath);
    const plugins = await getPlugins();
    const start = plugins.start();

    panelManager.addPanel(webviewPanel);
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    async function updateWebview(results: any[]) {
      if (results) {
        console.log("rendering", results);
        webviewPanel.webview.postMessage({ type: "render", model: results });
      }
    }

    async function handleSourceChange(): Promise<void> {
      // TODO: Notify plugin when it's cost-effective.
    }

    async function handleSourceSave(e: any): Promise<void> {
      if (e.uri.toString() === document.uri.toString()) {
        const results = await plugins.onChange({
          change: {
            source: "TEXT",
            action: "SAVE_FILE",
            filePath,
          },
          context: await buildContext(document, sysl),
        });
        await updateWebview(flatten(results.map(getDiagrams)));
      }
    }

    async function handleDiagramChange(e: any): Promise<void> {
      console.debug("event from diagram", e);
      switch (e.type) {
        case "diagramModelChange":
          console.log("diagramModelChange", e.delta);
          await plugins.onChange({
            change: {
              source: "DIAGRAM",
              action: "MODIFY",
              filePath,
              detail: {
                model: e.model,
                delta: e.delta,
              },
            },
            context: await buildContext(document, sysl),
          });
          break;
        case "select":
          // if (window.visibleTextEditors) {
          //   const app = proto.apps?.[e.target];
          //   app && revealApp(app, window.visibleTextEditors);
          // }
          break;
      }
    }

    const subscriptions = [
      workspace.onDidChangeTextDocument(handleSourceChange),
      workspace.onDidSaveTextDocument(handleSourceSave),
      webviewPanel.webview.onDidReceiveMessage(handleDiagramChange),
    ];

    // Request the first render.
    // TODO: Invoke a more precise function.
    const requestRender = async () =>
      plugins.onChange({
        change: {
          source: "TEXT",
          action: "SAVE_FILE",
          filePath,
        },
        context: await buildContext(document, sysl),
      });
    start.then(requestRender).then((results) => updateWebview(flatten(results.map(getDiagrams))));

    // Make sure we get rid of the listener when our editor is closed.
    webviewPanel.onDidDispose(() => {
      subscriptions.forEach((s) => s.dispose());
      panelManager.disposePanel(webviewPanel);
    });
  }

  /**
   * Get the static html used for the editor webviews.
   */
  private getHtmlForWebview(webview: Webview): string {
    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();

    const base = this.context.extensionUri;
    const scriptUri = webview.asWebviewUri(
      Uri.file(join(base.fsPath, "renderer", "build", "static", "js", "main.js"))
    );
    const styleMainUri = webview.asWebviewUri(
      Uri.file(join(base.fsPath, "renderer", "build", "static", "css", "main.css"))
    );

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="${styleMainUri}" rel="stylesheet" />

          <title>Sysl Diagram Editor</title>
      </head>
      <body>
          <div id="root"/>
          <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}

/** Returns a random string. */
function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function buildContext(document: TextDocument, sysl: Sysl): Promise<Context> {
  const filePath = document.uri.fsPath;
  return {
    filePath,
    module: (await sysl.protobuf(filePath)).toString("base64"),
    syslRoot: workspace.getWorkspaceFolder(document.uri)?.uri.fsPath,
  };
}

// TODO: Reuse types from renderer.
type RendererModel = {
  nodes: any[];
  edges: any[];
  templates?: {
    diagramLabel: string;
    diagramLayout?: any;
    nodes?: { [key: string]: any };
    groups?: { [key: string]: any };
    edges?: { [key: string]: any };
  };
};

function getDiagrams(res: OnChangeResponse): RendererModel[] {
  return filter(res.renderDiagram?.map((r) => r.content as any as RendererModel));
}
