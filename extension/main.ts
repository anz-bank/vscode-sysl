import { commands } from "vscode";
import { LanguageClient } from "vscode-languageclient/node";

import { installSyslLspCommand } from "./constants";
import { buildClient, installSyslLsp } from "./lsp/syslLsp";

/** The language client, created in {@link activate}, to be cleaned up in {@link deactivate}. */
let client: LanguageClient;

export function activate() {
    commands.registerCommand(installSyslLspCommand, installSyslLsp);

    // Start the client. This will also launch the server.
    client = buildClient();
    client.start();
}

export async function deactivate(): Promise<void> {
    if (client) {
        return client.stop();
    }
}
