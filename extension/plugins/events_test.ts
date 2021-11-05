import { pull } from "lodash";
import { Disposable } from "../views/types";
import { Document, DocumentChangeEvent, Events } from "./types";

type DocumentChangeListener = (e: DocumentChangeEvent) => any;
type RenderCommandListener = (doc: Document) => any;

export class TestEvents implements Events {
  private readonly onRenderListeners: RenderCommandListener[] = [];
  private readonly onDidChangeTextDocumentListeners: DocumentChangeListener[] = [];
  private readonly onDidSaveTextDocumentListeners: DocumentChangeListener[] = [];

  async simulateRender(doc: Document): Promise<void> {
    await Promise.all(this.onRenderListeners.map((callback) => callback(doc)));
  }

  async simulateChangeTextDocument(e: DocumentChangeEvent): Promise<void> {
    await Promise.all(this.onDidChangeTextDocumentListeners.map((callback) => callback(e)));
  }

  async simulateSaveTextDocument(e: DocumentChangeEvent): Promise<void> {
    await Promise.all(this.onDidSaveTextDocumentListeners.map((callback) => callback(e)));
  }

  register(): Disposable {
    return { dispose: () => {} };
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
