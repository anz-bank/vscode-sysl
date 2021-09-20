import { commands, ExtensionContext, window, ViewColumn, Uri } from "vscode";
import { LanguageClient } from "vscode-languageclient/node";

import { customViewType, installSyslLspCommand, TextEditorCommandMap } from "./constants";
import { SyslGoJsDiagramEditorProvider } from "./editor/diagram";
import { buildClient, installSyslLsp } from "./lsp/syslLsp";

/** The language client, created in {@link activate}, to be cleaned up in {@link deactivate}. */
let client: LanguageClient;

export function activate(context: ExtensionContext) {
  commands.registerCommand(installSyslLspCommand, installSyslLsp);

  // Start the client. This will also launch the server.
  client = buildClient();
  // client.start();

  context.subscriptions.push(SyslGoJsDiagramEditorProvider.register(context));

  // Use the TextEditorCommandMap to ensure all commands are handled.
  const textCommands: TextEditorCommandMap = {
    "sysl.renderDiagram": openGoJSEditorFor,
  };
  for (let key in textCommands) {
    context.subscriptions.push(commands.registerCommand(key, textCommands[key]));
  }
}

export async function deactivate(): Promise<void> {
  await client?.stop();
}

/**
 * Opens the custom editor for the document at the given URI, or the active editor document if the
 * URI is undefined.. */
function openGoJSEditorFor(uri: Uri | undefined): void {
  uri ||= window.activeTextEditor?.document.uri;
  if (uri) {
    commands.executeCommand("vscode.openWith", uri, customViewType, ViewColumn.Beside);
  } else {
    console.warn("failed to open diagram editor: no URI or active document");
  }
}
