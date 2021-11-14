"use strict";
import { LanguageClient, LanguageClientOptions, ServerOptions } from "vscode-languageclient/node";
import { Sysl } from "../../tools/sysl";

/** Creates and returns a language client to connect to the language server. */
export function buildClient(sysl: Sysl): LanguageClient {
  const inspectPort = 6050;
  const exec = {
    command: sysl.path,
    args: ["lsp"],
    execArgv: ["--nolazy", `--inspect=${inspectPort}`],
  };
  const serverOptions: ServerOptions = { debug: exec, run: exec };
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "sysl" }],
  };

  return new LanguageClient("Sysl", "Sysl Language Server", serverOptions, clientOptions);
}
