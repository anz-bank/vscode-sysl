import { commands, ExtensionContext, window, workspace } from "vscode";
import { LanguageClient } from "vscode-languageclient/node";

import { syslBinaryPath } from "./constants";
import { buildClient } from "./lsp/client/sysl";
import { Sysl } from "./tools/sysl";
import { checkSysl, errorMessage, getOrDownloadSysl } from "./tools/sysl_download";
import { PluginEngine } from "./plugins/plugin_engine";
import { MultiDocumentViewEditorProvider } from "./views/multi/provider";
import { viewRegistry } from "./views";
import { CustomEditorMultiViewFactory } from "./views/multi/factory_vscode";
import { VsCodeEvents } from "./plugins/events_vscode";
import { PluginClientOptions } from "./plugins/types";

/** The language client, created in {@link activate}, to be cleaned up in {@link deactivate}. */
let client: LanguageClient;
let pluginEngine: PluginEngine;

export async function activate(context: ExtensionContext) {
  let sysl: Sysl;
  try {
    sysl = await getSysl(context);
  } catch (e) {
    handleMissingSysl();
    return;
  }

  // Start the Sysl language client. This will also launch the server.
  client = buildClient(sysl);
  client.start();

  // TODO: Find a more elegant way to inject this. This seems to be just barely enough to break
  // the cyclic dependency.
  viewRegistry.multiviewFactory = new CustomEditorMultiViewFactory();
  viewRegistry.docFinder = workspace.openTextDocument;
  MultiDocumentViewEditorProvider.register(context);

  pluginEngine = await buildPluginEngine(context, sysl);
  await pluginEngine.activate();

  const output = window.createOutputChannel("Sysl");
  output.appendLine(`Registered ${pluginEngine.plugins.length} plugins`);
}

export async function deactivate(): Promise<void> {
  await client?.stop();
  pluginEngine.deactivate();
}

/** Ensures the Sysl binary is available and returns a wrapper around it. */
async function getSysl(context: ExtensionContext): Promise<Sysl> {
  const syslPath = workspace.getConfiguration().get<string>(syslBinaryPath);
  return syslPath
    ? await checkSysl(syslPath)
    : await getOrDownloadSysl(context.globalStorageUri.fsPath);
}

/** Creates the engine to manage plugins for the extension. */
async function buildPluginEngine(context: ExtensionContext, sysl: Sysl): Promise<PluginEngine> {
  const workspaceDirs = workspace.workspaceFolders?.map((f) => f.uri.fsPath) ?? [];
  const options: PluginClientOptions = {
    debug: Sysl.isDebugEnabled(),
    workspaceFolder: workspaceDirs[0],
  };

  const events = new VsCodeEvents();
  return new PluginEngine({
    sysl,
    extensionPath: context.extensionPath,
    workspaceDirs,
    events,
    options,
  });
}

/**
 * Informs the users that Sysl is not available, and the extension will not function, without
 * causing the extension to fail in the process.
 */
function handleMissingSysl() {
  const show = () => {
    const setPathItem = "Set Path to Sysl";
    window.showErrorMessage(errorMessage.syslUnavailable, setPathItem).then((item) => {
      if (item === setPathItem) {
        commands.executeCommand("workbench.action.openSettings", "sysl.tool.binaryPath");
      }
    });
  };
  show();
  commands.registerCommand("sysl.renderDiagram", show);
}
