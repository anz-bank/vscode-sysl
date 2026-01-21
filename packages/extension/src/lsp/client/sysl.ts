import { LanguageClient, LanguageClientOptions, ServerOptions } from "vscode-languageclient/node";
import { Sysl } from "../../tools/sysl";

/** Creates and returns a language client to connect to the language server. */
export function buildClient(sysl: Sysl): LanguageClient {
  const serverOptions: ServerOptions = {
    command: sysl.path,
    args: ["lsp"],
  };
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "sysl" }],
  };

  return new LanguageClient("sysl", "Sysl Language Server", serverOptions, clientOptions);
}
