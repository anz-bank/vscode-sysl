import { Disposable } from "@anz-bank/vscode-sysl-model";
import { get } from "lodash";
import {
  commands,
  ConfigurationTarget,
  ExtensionContext,
  TextDocument,
  window,
  workspace,
} from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { URI } from "vscode-uri";
import actions from "./actions";
import { getSyslConfig } from "./config_vscode";
import { output, remoteUrl, renderDiagramCommand, syslBinaryPath } from "./constants";
import { buildClient } from "./lsp/client/sysl";
import { VsCodeEvents } from "./plugins/events_vscode";
import { PluginEngine } from "./plugins/plugin_engine";
import { PluginClientOptions } from "./plugins/types";
import { Sysl } from "./tools/sysl";
import { errorMessage, SyslDownloader } from "./tools/sysl_download";
import { viewRegistry } from "./views";
import { CustomEditorMultiViewFactory } from "./views/multi/factory_vscode";
import { MultiDocumentViewEditorProvider } from "./views/multi/provider";

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

  // Activate actions before plugins, since plugins will contribute and potentially invoke actions.
  actions.activate(sysl);

  pluginEngine = await buildPluginEngine(context, sysl);
  await pluginEngine.activate();

  watchAuxFiles();

  output.appendLine(`Initializing plugins...`);
  const ids = pluginEngine.plugins.map((p) => p.id).join(", ");
  output.appendLine(`Registered ${pluginEngine.plugins.length} plugins (${ids})`);

  // TODO: Generalize test instrumentation.
  (global as any).__test__?.onActivated();
}

export async function deactivate(): Promise<void> {
  await client?.stop();
  await pluginEngine.deactivate();
}

/** Ensures the Sysl binary is available and returns a wrapper around it. */
async function getSysl(context: ExtensionContext): Promise<Sysl> {
  const config = getSyslConfig();
  const dl = new SyslDownloader(config);
  const syslPath = get(config, syslBinaryPath);
  if (syslPath) {
    return await dl.checkSysl(syslPath);
  } else {
    const sysl = await dl.getOrDownloadSysl(context.globalStorageUri.fsPath);
    // Set the Sysl path config setting to this path.
    await workspace
      .getConfiguration()
      .update(syslBinaryPath, sysl.path, ConfigurationTarget.Global);
    return sysl;
  }
}

/** Creates the engine to manage plugins for the extension. */
async function buildPluginEngine(context: ExtensionContext, sysl: Sysl): Promise<PluginEngine> {
  const workspaceDirs = workspace.workspaceFolders?.map((f) => f.uri.fsPath) ?? [];
  const options: PluginClientOptions = {
    debug: Sysl.isDebugEnabled(),
    workspaceFolder: workspaceDirs[0],
    workspaceConfig: getSyslConfig(),
  };

  const events = new VsCodeEvents(sysl);
  return new PluginEngine({
    sysl,
    extensionPath: context.extensionPath,
    workspaceDirs,
    remoteUrl,
    globalStoragePath: context.globalStorageUri.fsPath,
    events,
    options,
  });
}

/**
 * Ensures that all open Sysl files also have their auxiliary files opened.
 *
 * This is a bit of a hack to ensure the contents of the auxiliary files are available to the LSP
 * plugin servers via the regular text sync channels. In reality the plugins should either be told
 * what auxiliary files exist in some way, or they should be able to request them on demand.
 */
function watchAuxFiles(): Disposable {
  const isRegularSpec = (doc: TextDocument) =>
    /\.sysl$/.test(doc.uri.fsPath) && !/\.\w+\.sysl$/.test(doc.uri.fsPath);

  const findAuxs = (doc: TextDocument): Thenable<URI[]> =>
    workspace.findFiles(doc.uri.fsPath.replace(/\.sysl$/, ".*.sysl"));

  // Open auxiliary files for each already-open file.
  workspace.textDocuments.filter(isRegularSpec).map(async (doc) => {
    (await findAuxs(doc)).map((uri) => workspace.openTextDocument(uri.fsPath));
  });
  // Open auxiliary files for each newly-opened file.
  return workspace.onDidOpenTextDocument(async (doc) => {
    if (isRegularSpec(doc)) {
      (await findAuxs(doc)).map((uri) => workspace.openTextDocument(uri.fsPath));
    }
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
        commands.executeCommand("workbench.action.openSettings", syslBinaryPath);
      }
    });
  };
  show();
  commands.registerCommand(renderDiagramCommand, show);
}
