import { Disposable } from "@anz-bank/vscode-sysl-model";
import { pull } from "lodash";
import { Document, DocumentChangeEvent, Events } from "./types";

type DocumentChangeListener = (e: DocumentChangeEvent) => any;
type DocumentListener = (doc: Document) => any;

export class TestEvents implements Events {
  private readonly onRenderListeners: DocumentListener[] = [];
  private readonly onImportListeners: DocumentListener[] = [];
  private readonly onDidChangeTextDocumentListeners: DocumentChangeListener[] = [];
  private readonly onDidSaveTextDocumentListeners: DocumentChangeListener[] = [];
  private readonly onDidOpenTextDocumentListeners: DocumentListener[] = [];
  private readonly onDidCloseTextDocumentListeners: DocumentListener[] = [];

  async simulateRender(doc: Document): Promise<void> {
    await Promise.all(this.onRenderListeners.map((callback) => callback(doc)));
  }

  async simulateImport(doc: Document): Promise<void> {
    await Promise.all(this.onImportListeners.map((callback) => callback(doc)));
  }

  async simulateChangeTextDocument(e: DocumentChangeEvent): Promise<void> {
    await Promise.all(this.onDidChangeTextDocumentListeners.map((callback) => callback(e)));
  }

  async simulateDidOpenTextDocument(e: Document) {
    await Promise.all(this.onDidOpenTextDocumentListeners.map((callback) => callback(e)));
  }

  async simulateDidCloseTextDocument(e: Document) {
    await Promise.all(this.onDidCloseTextDocumentListeners.map((callback) => callback(e)));
  }

  async simulateSaveTextDocument(e: DocumentChangeEvent): Promise<void> {
    await Promise.all(this.onDidSaveTextDocumentListeners.map((callback) => callback(e)));
  }

  register(): Disposable {
    return { dispose: () => {} };
  }

  onRender(listener: DocumentListener): Disposable {
    this.onRenderListeners.push(listener);
    return { dispose: () => pull(this.onRenderListeners, listener) };
  }

  onImport(listener: DocumentListener): Disposable {
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
