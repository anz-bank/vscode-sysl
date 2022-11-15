import { TextDocument, WebviewPanel, WebviewPanelOnDidChangeViewStateEvent } from "vscode";
import { pull } from "lodash";
import { Disposable } from "@anz-bank/vscode-sysl-model";

/**
 * A Webview-based editor for a text document.
 *
 * This is a wrapper class that exposes an API for interacting with the contents of the editor as
 * you would a TextEditor.
 */
export class CustomEditor {
  constructor(readonly document: TextDocument, readonly webviewPanel: WebviewPanel) {}

  // WIP
  render(data: any): Thenable<boolean> {
    // TODO: send data.type as well.
    return this.webviewPanel.webview.postMessage({
      type: "render",
      model: data.map((d: any) => d.content),
    });
  }
}

/**
 * Stores a collection of WebviewPanels for retrieval by tests.
 *
 * Exported for testing only. Application code should use the singleton instance.
 */
export class CustomEditorManager {
  /** Array of WebviewPanels that have been created to find the active one. */
  private editors: CustomEditor[] = [];

  /**
   * Array of disposables for listeners to registered panel view state changes.
   *
   * Aligned with {@link editors} such that disposable i disposes of the listening for view
   * state changes in panel i.
   */
  private viewStateChangeListenersDisposables: Disposable[] = [];

  /**
   * Array of callbacks to invoke when the view state of any panel changes.
   */
  private onDidChangeVisiblePanelsListeners: ((p: CustomEditor) => any)[] = [];

  /** Returns the active CustomEditor if there is one, or undefined. */
  public get activeCustomEditor(): CustomEditor | undefined {
    return this.editors.find((p) => p.webviewPanel.active);
  }

  /** Returns the visible WebviewPanels. */
  public get visibleCustomEditors(): CustomEditor[] {
    return this.editors.filter((p) => p.webviewPanel.visible);
  }

  public visibleEditorsForDoc(uri: string): CustomEditor[] {
    return this.visibleCustomEditors.filter((p) => p.document.uri.toString() === uri);
  }

  /** Adds a panel to the collection. */
  addEditor(editor: CustomEditor): void {
    this.editors.push(editor);

    const listener = this.handleViewStateChange.bind(this);
    const disposable = editor.webviewPanel.onDidChangeViewState(listener);
    this.viewStateChangeListenersDisposables.push(disposable);
  }

  /**
   * Handles the disposal of a panel by removing it from the collection and disposing of its view
   * state change listener.
   */
  disposeEditor(panel: CustomEditor): void {
    const index = this.editors.findIndex((p) => p === panel);
    if (index == -1) {
      return;
    }
    this.editors.splice(index, 1);
    const [disposable] = this.viewStateChangeListenersDisposables.splice(index, 1);
    disposable.dispose();
  }

  /**
   * Registers a listener that is invoked when the visibility of any managed panels changes.
   */
  onDidChangeVisiblePanels(
    listener: (editor: CustomEditor) => any,
    thisArg?: any,
    disposables?: Disposable[]
  ): Disposable {
    if (thisArg) {
      listener = listener.bind(thisArg);
    }
    this.onDidChangeVisiblePanelsListeners.push(listener);

    const disposable = {
      dispose: () => {
        pull(this.onDidChangeVisiblePanelsListeners, listener);
      },
    };

    if (disposables) {
      disposables.push(disposable);
    }
    return disposable;
  }

  /**
   * Handles the change of the view state of a managed panel by invoking registered callbacks.
   * @param e The event emitted by the change.
   */
  private handleViewStateChange(e: WebviewPanelOnDidChangeViewStateEvent) {
    const editor = this.editorForWebviewPanel(e.webviewPanel);
    if (!editor) {
      console.warn("change in unregistered panel");
      return;
    }

    this.onDidChangeVisiblePanelsListeners.forEach((listener: (editor: CustomEditor) => any) =>
      listener(editor)
    );
  }

  /** Returns the custom editor instance containing a panel, if it exists. */
  private editorForWebviewPanel(panel: WebviewPanel): CustomEditor | undefined {
    return this.editors.find((e) => e.webviewPanel === panel);
  }
}

/** Singleton instance to work with in application code. */
export const customEditorManager = new CustomEditorManager();

// Hack to expose the panels to the test framework.
// Static variables aren't available in CI for some reason.
if ((global as any).__test__) {
  (global as any).__test__.customEditorManager = customEditorManager;
}
