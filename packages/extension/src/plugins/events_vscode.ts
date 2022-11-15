import { Disposable } from "@anz-bank/vscode-sysl-model";
import { identity, pull } from "lodash";
import path, { basename } from "path";
import {
  commands,
  ProgressLocation,
  TextDocument,
  TextDocumentChangeEvent,
  Uri,
  window,
  workspace,
} from "vscode";
import { importCommand, output, renderDiagramCommand, syslExt } from "../constants";
import { Sysl } from "../tools/sysl";
import { Events } from "./types";

type DocumentChangeListener = (e: TextDocumentChangeEvent) => any;
type DocumentListener = (doc: TextDocument) => any;

type ImportConfig = {
  format: string;
  mapInput?: (input: string) => string;
};

/** Map of import format labels to format-specific configs. */
const importLabelToConfig: { [key: string]: ImportConfig } = {
  "Avro schema": { format: "avro" },
  "BigQuery SQL": { format: "bigquery" },
  "JSON Schema": { format: "jsonschema" },
  "MySQL SQL": { format: "mysql" },
  "MySQL directory": { format: "mysqlDir", mapInput: path.dirname },
  "OpenAPI 3": { format: "openapi3" },
  "PostgreSQL SQL": { format: "postgres" },
  "PostgreSQL directory": { format: "postgresDir", mapInput: path.dirname },
  Protobuf: { format: "protobuf" },
  "Protobuf directory": { format: "protobufDir", mapInput: path.dirname },
  "Spanner SQL": { format: "spannerSQL" },
  "Spanner directory": { format: "spannerSQLdir", mapInput: path.dirname },
  "Swagger (OpenAPI 2)": { format: "swagger" },
  XSD: { format: "xsd" },
};

export class VsCodeEvents implements Events {
  private readonly onRenderListeners: DocumentListener[] = [];
  private readonly onDidChangeTextDocumentListeners: DocumentChangeListener[] = [];
  private readonly onDidSaveTextDocumentListeners: DocumentChangeListener[] = [];
  private readonly onDidOpenTextDocumentListeners: DocumentListener[] = [];
  private readonly onDidCloseTextDocumentListeners: DocumentListener[] = [];

  constructor(private readonly sysl: Sysl) {}

  register(): Disposable {
    const disposables = [
      commands.registerCommand(renderDiagramCommand, this.handleRenderCommand.bind(this)),
      commands.registerCommand(importCommand, this.handleImportCommand.bind(this)),

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
    if (!document) return;

    this.onRenderListeners.forEach((callback) => callback(document));
  }

  private async handleImportCommand(uri: Uri | undefined) {
    const document = uri
      ? await workspace.openTextDocument(uri)
      : window.activeTextEditor?.document;
    if (!document) return;

    const docPath = document.uri.fsPath;
    const title = "Sysl import: Select source file format";
    window.showQuickPick(Object.keys(importLabelToConfig), { title }).then((name) => {
      if (!name || !importLabelToConfig[name] || docPath.endsWith(syslExt)) return;

      const config = importLabelToConfig[name];
      const title = `Importing ${basename(docPath)} to Sysl...`;
      window.withProgress({ location: ProgressLocation.Notification, title }, async () => {
        try {
          const outputPath = `${docPath}${syslExt}`;
          const input = (config.mapInput ?? ((p) => p))(docPath);
          const out = await this.sysl.import(input, {
            format: config.format,
            output: outputPath,
          });
          output.appendLine(`sysl import success for ${docPath} to ${out}`);
          window.showInformationMessage(`Sysl imported ${basename(docPath)} to ${out}`);
          // TODO handle errors
          workspace.openTextDocument(Uri.file(outputPath)).then(window.showTextDocument);
        } catch (err) {
          output.appendLine(`sysl import error for ${docPath}: ${err}`);
          window.showErrorMessage(`Sysl import of ${basename(docPath)} failed: ${err}`);
        }
      });
    });
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
