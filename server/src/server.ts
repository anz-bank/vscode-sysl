"use strict";

import {
    createConnection, Definition, Diagnostic, DiagnosticSeverity,
    IConnection, InitializeResult, IPCMessageReader, IPCMessageWriter,
    TextDocument, TextDocumentChangeEvent, TextDocumentPositionParams, TextDocuments,
} from "vscode-languageserver";
import { SyslConfigProvider } from "./config";
import { DefinitionProvider } from "./definition";
import { SymbolsProvider } from "./symbolsProvider";

// tslint:disable-next-line:no-var-requires
const SyslExtnParserErrorListener = require("./sysl/SyslExtnParserErrorListener").SyslExtnParserErrorListener;
const connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
// Create a simple text document manager. The text document manager
// supports full document sync only
const documents: TextDocuments = new TextDocuments();
const config = new SyslConfigProvider();
const symbolsProvider = new SymbolsProvider(config, connection);
const definitionProvider = new DefinitionProvider(symbolsProvider, connection);

documents.listen(connection);

connection.onInitialize((/*_params: InitializeParams*/): InitializeResult => {
    return {
        capabilities: {
            definitionProvider: true,
            // Tell the client that the server works in FULL text document sync mode
            textDocumentSync: documents.syncKind,
        },
    };
});

connection.onDidChangeConfiguration((change) => {
    const settings = change.settings;
    config.update(settings);
    documents.all().forEach((doc: TextDocument) => {
        symbolsProvider.parseSyslInput(doc.uri);
    });
});

function createDiagnostic(lineNum: number, charIndex: number, msg: string): Diagnostic {
    return {
        message: msg,
        range: {
            end: { line: lineNum, character: charIndex + 10 },
            start: { line: lineNum, character: charIndex },
        },
        severity: DiagnosticSeverity.Error,
        source: "sysl",
    };
}

function validateTextDocument(textDocument: TextDocument): void {
    const diagnostics: Diagnostic[] = [];
    const listener = new SyslExtnParserErrorListener(connection);
    symbolsProvider.parse(textDocument.getText(), listener);

    if (listener.errors.length > 0) {
        for (const e of listener.errors) {
            diagnostics.push(createDiagnostic(e.line, e.column, e.msg));
        }
    }
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
    validateTextDocument(change.document);
});

documents.onDidOpen((e: TextDocumentChangeEvent) => {
    symbolsProvider.parseSyslInput(e.document.uri);
});

documents.onDidSave((e) => {
  symbolsProvider.parseSyslInput(e.document.uri);
});

connection.onDidChangeWatchedFiles(() => {
    // Monitored files have change in VSCode
    connection.console.log("We received an file change event");
});

connection.onDefinition((params: TextDocumentPositionParams): Definition => {
    try {
        return definitionProvider.onDefinition(params);
    } catch (e) {
        connection.console.log("Error: onDefinition");
        connection.console.log(JSON.stringify(e));
        connection.console.error(e);
    }
    return null;
});

// Listen on the connection
connection.listen();
