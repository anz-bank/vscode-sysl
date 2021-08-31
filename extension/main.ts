import { commands, ExtensionContext, window, ViewColumn, Uri } from "vscode";
import { LanguageClient } from "vscode-languageclient/node";

import { customViewType, installSyslLspCommand } from "./constants";
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
  const openWebview = commands.registerCommand("sysl.renderDiagram", openGoJSEditorFor);
  context.subscriptions.push(openWebview);
}

export async function deactivate(): Promise<void> {
  await client?.stop();
}

function openGoJSEditorFor(uri: Uri | undefined): void {
  uri ||= window.activeTextEditor?.document.uri;
  uri && commands.executeCommand("vscode.openWith", uri, customViewType, ViewColumn.Beside);
}
