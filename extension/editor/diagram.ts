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
  ProgressLocation,
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
import { parseSnapshotEvent, SnapshotEvent, snapshotEventType } from "./snapshot";

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
      "sysl.diagram.snapshot": () => postToActive("snapshotDiagram"),
    };
    for (let key in editorCommands) {
      context.subscriptions.push(commands.registerCommand(key, editorCommands[key]));
    }

    return providerRegistration;
  }

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
      window.withProgress({
        location: ProgressLocation.Notification
      }, async (progress) => {
        if (e.uri.toString() !== document.uri.toString()) {
          return;
        }

        progress.report({ message: "Updating diagrams..." });
        return new Promise<void>((resolve) => {
          setTimeout(async () => {
            const results = await plugins.onChange({
              change: {
                source: "TEXT",
                action: "SAVE_FILE",
                filePath,
              },
              context: await buildContext(document, sysl),
            });
            progress.report({ message: "Rendering diagrams..." });
            await updateWebview(flatten(results.map(getDiagrams)));
            resolve();
          }, 1);
        });
      });
    }

    /**
     * Handles a snapshot event by writing the snapshot to disk and notifying the user of the path.
     * Returns the path.
     */
    async function saveSnapshot(event: SnapshotEvent): Promise<Uri> {
      const snapshot = parseSnapshotEvent(event, document.uri);
      await workspace.fs.writeFile(snapshot.path, snapshot.data);

      const snapshotDir = rootRelativePath(Uri.joinPath(snapshot.path, ".."));
      const info = `Snapshot saved to ${path.basename(snapshot.path.fsPath)} in ${snapshotDir}`;
      window.showInformationMessage(info);
      return snapshot.path;
    }

    async function handleDiagramChange(event: any): Promise<void> {
      console.debug("event from diagram", event);
      switch (event.type) {
        case "diagramModelChange":
          console.log("diagramModelChange", event.delta);
          await plugins.onChange({
            change: {
              source: "DIAGRAM",
              action: "MODIFY",
              filePath,
              detail: {
                model: event.model,
                delta: event.delta,
              },
            },
            context: await buildContext(document, sysl),
          });
          break;
        case "select":
          console.log(event.selectedData.current);
          // if (window.visibleTextEditors) {
          //   const app = proto.apps?.[e.target];
          //   app && revealApp(app, window.visibleTextEditors);
          // }
          break;
        case snapshotEventType:
          await saveSnapshot(event as SnapshotEvent);
          break;
      }
    }

    const subscriptions = [
      workspace.onDidChangeTextDocument(handleSourceChange),
      workspace.onDidSaveTextDocument(handleSourceSave),
      webviewPanel.webview.onDidReceiveMessage(handleDiagramChange),
    ];
    
    // Request the first render.
    start.then(() => handleSourceSave({uri: document.uri.toString()}));

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
  type?: { [key: string]: any };
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

/**
 * Returns the path to uri relative to the workspace folder containing it.
 *
 * The relative path includes a leading {@code /} representing the workspace folder.
 *
 * If uri is not in the workspace, returns the full filesystem path.
 */
function rootRelativePath(uri: Uri): string {
  const wsFolder = workspace.getWorkspaceFolder(uri);
  if (wsFolder) {
    return path.join(wsFolder.name, uri.fsPath.slice(wsFolder.uri.fsPath.length));
  }
  return uri.fsPath;
}
