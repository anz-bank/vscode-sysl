import * as path from "path";
import { commands, ConfigurationTarget, ExtensionContext, Uri, window, workspace } from "vscode";
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from "vscode-languageclient";

function setRoot(rootPath: string) {
    const syslConfig = workspace.getConfiguration("sysl.workspace");
    syslConfig.update("root", rootPath, false);
}

function setGoSysl(p: string) {
    const syslConfig = workspace.getConfiguration("sysl.tool");
    syslConfig.update("parser", p, false);
}

function getRoot() {
    const syslConfig = workspace.getConfiguration("sysl.workspace");
    if (syslConfig.root === ".") {
        syslConfig.update("root", workspace.rootPath, ConfigurationTarget.Workspace);
        return workspace.rootPath;
    }
    return syslConfig.root;
}

function activate(context: ExtensionContext) {
    const root = getRoot();

    context.subscriptions.push(commands.registerCommand("sysl.selectRoot", () => {
        window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            defaultUri: Uri.file(getRoot()),
            openLabel: "Select Root",
        }).then((folder) => {
            if (folder === undefined) { return; }
            setRoot(folder[0].path);
        });
    }));

    context.subscriptions.push(commands.registerCommand("sysl.selectGoSysl", () => {
        window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: "Select Go-Sysl",
        }).then((p) => {
            if (p === undefined) { return; }
            setGoSysl(p[0].path);
        });
    }));

    const serverModule = context.asAbsolutePath(path.join("server", "server.js"));
    const debugOptions = { execArgv: ["--nolazy", "--debug=6009"] };

    const scheme = {
        language: "sysl",
        scheme: "file",
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [scheme],
        initializationOptions: {
            root,
        },
        synchronize: {
            configurationSection: "sysl",
        },
    };

    const serverOptions: ServerOptions = {
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions },
        run: { module: serverModule, transport: TransportKind.ipc },
    };

    const disposable = new LanguageClient("SYSL", "SYSL Language Server", serverOptions, clientOptions).start();

    context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
    // no op
}
exports.deactivate = deactivate;
