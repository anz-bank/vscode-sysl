import { LanguageClientOptions, ServerOptions } from "vscode-languageclient/node";
import { Sysl } from "../tools/sysl";
import { RunOptions } from "./command_client";
import { PluginClientOptions } from "./types";

export interface PluginConfig {
  id: string;
  name?: string;
}

export interface LspPluginConfig extends PluginConfig {
  lsp: {
    scriptPath: string;
    clientOptions: LanguageClientOptions;
    serverOptions: ServerOptions;
    forceDebug?: boolean;
  };
}

/** @deprecated */
export interface TransformPluginConfig extends PluginConfig {
  transform: {
    sysl: Sysl;
    scriptPath: string;
    clientOptions?: PluginClientOptions;
  };
}

/** @deprecated */
export interface CommandPluginConfig extends PluginConfig {
  command: {
    sysl: Sysl;
    runOptions: RunOptions;
    clientOptions?: PluginClientOptions;
  };
}
