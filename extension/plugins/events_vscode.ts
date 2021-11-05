import { pull } from "lodash";
import { commands, TextDocument, TextDocumentChangeEvent, Uri, window, workspace } from "vscode";
import { Disposable } from "../views/types";
import { Events } from "./types";

type DocumentChangeListener = (e: TextDocumentChangeEvent) => any;
type RenderCommandListener = (doc: TextDocument) => any;

export class VsCodeEvents implements Events {
  private readonly onRenderListeners: RenderCommandListener[] = [];
  private readonly onDidChangeTextDocumentListeners: DocumentChangeListener[] = [];
  private readonly onDidSaveTextDocumentListeners: DocumentChangeListener[] = [];

  register(): Disposable {
    const disposables = [
      commands.registerCommand("sysl.renderDiagram", this.handleRenderCommand.bind(this)),
      workspace.onDidChangeTextDocument(this.handleDidChangeTextDocument.bind(this)),
      workspace.onDidSaveTextDocument(this.handleDidSaveTextDocument.bind(this)),
    ];
    return { dispose: () => disposables.forEach((d) => d.dispose()) };
  }

  private async handleRenderCommand(uri: Uri | undefined) {
    const document = uri
      ? await workspace.openTextDocument(uri)
      : window.activeTextEditor?.document;
    if (!document) {
      return;
    }

    this.onRenderListeners.forEach((callback) => callback(document));
  }

  private async handleDidChangeTextDocument(e: TextDocumentChangeEvent) {
    this.onDidChangeTextDocumentListeners.forEach((callback) => callback(e));
  }

  private async handleDidSaveTextDocument(document: TextDocument) {
    this.onDidSaveTextDocumentListeners.forEach((callback) =>
      callback({ document, contentChanges: [] })
    );
  }

  onRender(listener: RenderCommandListener): Disposable {
    this.onRenderListeners.push(listener);
    return { dispose: () => pull(this.onRenderListeners, listener) };
  }

  onDidChangeTextDocument(listener: DocumentChangeListener): Disposable {
    this.onDidChangeTextDocumentListeners.push(listener);
    return { dispose: () => pull(this.onDidChangeTextDocumentListeners, listener) };
  }

  onDidSaveTextDocument(listener: DocumentChangeListener): Disposable {
    this.onDidSaveTextDocumentListeners.push(listener);
    return { dispose: () => pull(this.onDidSaveTextDocumentListeners, listener) };
  }
}
