import { ViewKey } from "@anz-bank/vscode-sysl-model";
import { ViewKind, ViewModel, ViewModelDelta } from "@anz-bank/vscode-sysl-plugin";
import { last } from "lodash";
import {
  commands,
  CustomTextEditorProvider,
  Disposable,
  TextDocument,
  ViewColumn,
  WebviewPanel,
  window,
} from "vscode";
import { views } from "..";
import { CustomEditor, customEditorManager } from "../../editor/custom_editors";
import { View } from "../types";
import { HtmlDocumentView, RawWebViewSurface } from "./views";

/**
 * Renders HTML produced by a factory in a webview.
 */
export class HtmlDocumentViewEditorProvider implements CustomTextEditorProvider {
  public static register(): Disposable {
    const provider = new HtmlDocumentViewEditorProvider();
    const type = HtmlDocumentViewEditorProvider.viewType;
    const providerRegistration = window.registerCustomEditorProvider(type, provider);
    return providerRegistration;
  }

  public static viewType = "sysl.htmlView";

  constructor() {}

  public async resolveCustomTextEditor(
    document: TextDocument,
    webviewPanel: WebviewPanel
  ): Promise<void> {
    const editor = new CustomEditor(document, webviewPanel);
    customEditorManager.addEditor(editor);

    webviewPanel.webview.options = { enableScripts: true };
    const key: ViewKey = {
      docUri: document.uri.toString(),
      pluginId: "",
      viewId: "",
    };
    const surface = new RawWebViewSurface(webviewPanel.webview);
    const view = new HtmlDocumentView(key, surface as any);
    views.acceptOpenView(view);

    webviewPanel.onDidDispose(() => {
      view.dispose();
      customEditorManager.disposeEditor(editor);
    });
  }
}

export class CustomEditorViewFactory {
  /** Creates standalone custom editor views based on a view {@code kind}. */
  async create<T extends ViewModel, D extends ViewModelDelta>(
    key: ViewKey,
    kind: ViewKind,
    initialModel?: T
  ): Promise<View<T, D>> {
    if (kind === "html") {
      const providerType = HtmlDocumentViewEditorProvider.viewType;
      return await this.open(key, providerType, initialModel);
    } else if (kind === "diagram") {
      // If we want to create a standalone diagram view.
      throw new Error("not implemented");
    } else {
      throw new Error("unknown view kind: " + kind);
    }
  }

  private async open<T extends ViewModel, D extends ViewModelDelta>(
    key: ViewKey,
    providerType: string,
    model?: T
  ): Promise<View<T, D>> {
    commands.executeCommand("vscode.openWith", key.docUri, providerType, ViewColumn.Beside);
    const view: View<T, D> = await new Promise((resolve) =>
      setTimeout(() => {
        // TODO: Replace with more robust callback.
        resolve(last(views.getViews(key))!);
      }, 1000)
    );
    model && view.setModel(model);
    return view;
  }
}
