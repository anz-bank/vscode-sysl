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
import { join } from "path";
import { pull } from "lodash";
import { checkSysl, getOrDownloadSysl } from "../tools/sysl_download";
import { PluginLocator, PluginManager } from "./plugins";

export class PanelManager {
  /** Array of WebviewPanels that have been created to find the active one. */
  private webviewPanels: WebviewPanel[] = [];

  /** Returns the active WebviewPanel if there is one, or undefined. */
  public getActivePanel(): WebviewPanel | undefined {
    return this.webviewPanels.find((p) => p.active);
  }

  addPanel(panel: WebviewPanel): void {
    this.webviewPanels.push(panel);
  }

  disposePanel(panel: WebviewPanel): void {
    pull(this.webviewPanels, panel);
  }
}

const panelManager = new PanelManager();

// Hack to expose the panels to the test framework.
// Static variables aren't available in CI for some reason.
(global as any).__test__ = { panelManager };

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

  public async resolveCustomTextEditor(
    document: TextDocument,
    webviewPanel: WebviewPanel
  ): Promise<void> {
    if (workspace.workspaceFolders?.length != 1) {
      throw new Error(
        "Cannot locate workspace or cannot find exactly one diagram renderer in .sysl/diagram_renderers/"
      );
    }

    const syslPath = workspace.getConfiguration().get<string>(syslBinaryPath);
    const sysl = syslPath
      ? await checkSysl(syslPath)
      : await getOrDownloadSysl(this.context.globalStorageUri.fsPath);
    const plugins = new PluginManager(await PluginLocator.all(sysl, this.context));

    panelManager.addPanel(webviewPanel);
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    async function updateWebview() {
      const model = await plugins.sourceToTarget(document);

      if (model) {
        webviewPanel.webview.postMessage({ type: "render", model });
      }
    }

    async function handleSourceChange(e: any): Promise<void> {
      if (e.document.uri.toString() === document.uri.toString()) {
        await updateWebview();
      }
    }

    const changeDocumentSubscription = workspace.onDidChangeTextDocument(handleSourceChange);

    await updateWebview();

    // Make sure we get rid of the listener when our editor is closed.
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
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
