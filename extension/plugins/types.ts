import { TextDocument } from "vscode";
import { TextDocumentContentChangeEvent } from "vscode-languageserver-protocol";
import { DocumentSelector } from "vscode-languageclient/node";
import { Position } from "vscode-languageserver-types";
import { URI } from "vscode-uri";
import { Logger } from "../tools/logging";
import { Disposable } from "../views/types";

/**
 * A plugin that contributes functionality to the VS Code extension.
 *
 * Each plugin should manage its own state and subscribe/act through the APIs available to it,
 * rather than merely exposing an API to be used like a library.
 */
export interface PluginClient {
  /** A string that uniquely identifies the plugin among all plugins.  */
  id: string;

  /** Activate the plugin. */
  start: () => Promise<void>;

  /** Deactivate the plugin. */
  stop: () => Promise<void>;

  /** Render any applicable views for a document. */
  render: (doc: TextDocument) => Promise<void>;
}

/** Details about the client's environment. */
export type PluginClientOptions = {
  workspaceFolder?: string;
  documentSelector?: DocumentSelector | string[];
  debug?: boolean;
  logger?: Logger;

  /** Minimum time (in ms) to wait between callbacks of the same kind. Default 500. */
  throttleDelay?: number;
};

export interface Document {
  uri: URI;
  languageId: string;
  version: number;
  lineCount: number;
  getText(): string;
  positionAt(offset: number): Position;
  offsetAt(position: Position): number;
}

/** For testing functions that take a document for its URI and content. */
export class SimpleDocument implements Document {
  languageId = "";
  version = 0;
  lineCount = 1;

  constructor(readonly uri: URI, private readonly _content: string) {}

  getText(): string {
    return this._content;
  }
  positionAt(offset: number): Position {
    return { line: 0, character: offset };
  }
  offsetAt(position: Position): number {
    return position.character;
  }
}

/** Alias for TextDocumentChangeEvent. */
export interface DocumentChangeEvent {
  /** The affected document. */
  readonly document: Document;

  /** An array of content changes. */
  readonly contentChanges?: readonly TextDocumentContentChangeEvent[];
}

/** Listens for raw render events and processes arguments. */
export interface Events {
  /** Starts listening for events to pass through to subscribers. */
  register(): Disposable;

  /** Subscribes {@link listener} to be invoked when the render command is fired. */
  onRender(listener: (doc: Document) => any): Disposable;

  /** Subscribes {@link listener} to be invoked when a text document is changed. */
  onDidChangeTextDocument(listener: (e: DocumentChangeEvent) => any): Disposable;

  /** Subscribes {@link listener} to be invoked when a text document is saved. */
  onDidSaveTextDocument(listener: (e: DocumentChangeEvent) => any): Disposable;
}

export type PluginKind =
  | "command"
  | "transform"
  | "lsp.module"
  | "lsp.command"
  | "ref"
  | "api"
  | "archive";

export interface PluginManifest {
  id: string;
  version: string;
  kind: PluginKind;
  entrypoint: string;
  config?: string;
  name?: string;
}

export interface PluginManifests {
  plugins: PluginManifest[];
}
