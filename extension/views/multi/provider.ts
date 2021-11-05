import {
  CustomTextEditorProvider,
  Disposable,
  ExtensionContext,
  TextDocument,
  WebviewPanel,
  window,
} from "vscode";
import { CustomEditor, customEditorManager } from "../../editor/custom_editors";
import { WebMultiView } from "./views";
import { views } from "..";
import { multiviewType } from ".";

/**
 * Renders multiple child DocumentViews, each as a frame inside the webview.
 */
export class MultiDocumentViewEditorProvider implements CustomTextEditorProvider {
  private basePath: string;

  public static register(context: ExtensionContext): Disposable {
    const provider = new MultiDocumentViewEditorProvider(context.extensionUri.fsPath);
    const type = multiviewType;
    const providerRegistration = window.registerCustomEditorProvider(type, provider);
    return providerRegistration;
  }

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  public async resolveCustomTextEditor(
    document: TextDocument,
    webviewPanel: WebviewPanel
  ): Promise<void> {
    const editor = new CustomEditor(document, webviewPanel);
    customEditorManager.addEditor(editor);

    webviewPanel.webview.options = { enableScripts: true };
    const multiview = new WebMultiView(document.uri, webviewPanel.webview, this.basePath);
    views.acceptOpenMultiView(document.uri, multiview);

    webviewPanel.onDidDispose(() => {
      multiview.dispose();
      customEditorManager.disposeEditor(editor);
    });
  }
}
