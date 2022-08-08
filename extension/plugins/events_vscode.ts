import { Disposable } from "@anz-bank/vscode-sysl-model";
import { pull } from "lodash";
import { commands, TextDocument, TextDocumentChangeEvent, Uri, window, workspace } from "vscode";
import { Events } from "./types";

type DocumentChangeListener = (e: TextDocumentChangeEvent) => any;
type DocumentListener = (doc: TextDocument) => any;

export class VsCodeEvents implements Events {
  private readonly onRenderListeners: DocumentListener[] = [];
  private readonly onDidChangeTextDocumentListeners: DocumentChangeListener[] = [];
  private readonly onDidSaveTextDocumentListeners: DocumentChangeListener[] = [];
  private readonly onDidOpenTextDocumentListeners: DocumentListener[] = [];
  private readonly onDidCloseTextDocumentListeners: DocumentListener[] = [];

  register(): Disposable {
    const disposables = [
      commands.registerCommand("sysl.renderDiagram", this.handleRenderCommand.bind(this)),
      workspace.onDidChangeTextDocument(this.handleDidChangeTextDocument.bind(this)),
      workspace.onDidSaveTextDocument(this.handleDidSaveTextDocument.bind(this)),
      workspace.onDidOpenTextDocument(this.handleDidOpenTextDocument.bind(this)),
      workspace.onDidCloseTextDocument(this.handleDidCloseTextDocument.bind(this)),
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

  private async handleDidOpenTextDocument(e: TextDocument) {
    this.onDidOpenTextDocumentListeners.forEach((callback) => callback(e));
  }

  private async handleDidCloseTextDocument(e: TextDocument) {
    this.onDidCloseTextDocumentListeners.forEach((callback) => callback(e));
  }

  private async handleDidSaveTextDocument(document: TextDocument) {
    this.onDidSaveTextDocumentListeners.forEach((callback) =>
      callback({ document, contentChanges: [], reason: undefined })
    );
  }

  onRender(listener: DocumentListener): Disposable {
    this.onRenderListeners.push(listener);
    return { dispose: () => pull(this.onRenderListeners, listener) };
  }

  onDidChangeTextDocument(listener: DocumentChangeListener): Disposable {
    this.onDidChangeTextDocumentListeners.push(listener);
    return { dispose: () => pull(this.onDidChangeTextDocumentListeners, listener) };
  }

  onDidOpenTextDocument(listener: DocumentListener): Disposable {
    this.onDidOpenTextDocumentListeners.push(listener);
    return { dispose: () => pull(this.onDidOpenTextDocumentListeners, listener) };
  }

  onDidCloseTextDocument(listener: DocumentListener): Disposable {
    this.onDidCloseTextDocumentListeners.push(listener);
    return { dispose: () => pull(this.onDidCloseTextDocumentListeners, listener) };
  }

  onDidSaveTextDocument(listener: DocumentChangeListener): Disposable {
    this.onDidSaveTextDocumentListeners.push(listener);
    return { dispose: () => pull(this.onDidSaveTextDocumentListeners, listener) };
  }
}
