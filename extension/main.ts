import {
  commands,
  ConfigurationTarget,
  ExtensionContext,
  ProgressLocation,
  TextDocument,
  window,
  workspace,
} from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { fromPairs } from "lodash";

import { syslBinaryPath, remoteUrl } from "./constants";
import { buildClient } from "./lsp/client/sysl";
import { Sysl } from "./tools/sysl";
import { checkSysl, errorMessage, getOrDownloadSysl } from "./tools/sysl_download";
import { PluginEngine } from "./plugins/plugin_engine";
import { MultiDocumentViewEditorProvider } from "./views/multi/provider";
import { viewRegistry } from "./views";
import { CustomEditorMultiViewFactory } from "./views/multi/factory_vscode";
import { VsCodeEvents } from "./plugins/events_vscode";
import { PluginClientOptions } from "./plugins/types";
import { URI } from "vscode-uri";
import { Disposable } from "@anz-bank/vscode-sysl-model";

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

  registerActions();
  watchAuxFiles();

  const output = window.createOutputChannel("Sysl");
  output.appendLine(`Registered ${pluginEngine.plugins.length} plugins`);

  // TODO: Generalize test instrumentation.
  (global as any).__test__?.onActivated();
}

export async function deactivate(): Promise<void> {
  await client?.stop();
  pluginEngine.deactivate();
}

/** Ensures the Sysl binary is available and returns a wrapper around it. */
async function getSysl(context: ExtensionContext): Promise<Sysl> {
  const syslPath = workspace.getConfiguration().get<string>(syslBinaryPath);
  if (syslPath) {
    return await checkSysl(syslPath);
  } else {
    const sysl = await getOrDownloadSysl(context.globalStorageUri.fsPath);
    // set the Sysl path in ext setting to this syslPath
    await workspace
      .getConfiguration()
      .update("sysl.tool.binaryPath", sysl.path, ConfigurationTarget.Global);
    return sysl;
  }
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
    remoteUrl,
    globalStoragePath: context.globalStorageUri.fsPath,
    events,
    options,
  });
}

function registerActions() {
  commands.registerCommand("sysl.action.list", () => {
    const actions = (global as any).actions;
    const toLabel = (a) => (a.category ? `${a.category}: ` : "") + a.title;
    const nameToId: { [key: string]: string } = fromPairs(
      actions.map((a) => [toLabel(a), a.action])
    );

    window.showQuickPick(Object.keys(nameToId)).then((name) => {
      if (!name || !nameToId[name]) {
        return;
      }
      const id = nameToId[name];
      window.withProgress({ location: ProgressLocation.Notification, title: name }, () =>
        commands.executeCommand(id, {
          uri: window.activeTextEditor?.document.uri.toString(),
        })
      );
    });
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
        commands.executeCommand("workbench.action.openSettings", "sysl.tool.binaryPath");
      }
    });
  };
  show();
  commands.registerCommand("sysl.renderDiagram", show);
}
