import { Disposable } from "@anz-bank/vscode-sysl-model";
import { Sysl } from "../tools/sysl";
import { PluginLocator } from "./locator";
import { PluginConfig } from "./plugin_config";
import { PluginFactory } from "./plugin_factory";
import { PluginClient, PluginClientOptions, Events, DocumentChangeEvent } from "./types";

/** Configures the plugin engine. */
export type PluginEngineConfig = {
  sysl?: Sysl;
  extensionPath?: string;
  workspaceDirs?: string[];
  remoteUrl?: string;
  globalStoragePath?: string;
  options?: PluginClientOptions;
  events: Events;
};

/**
 * Manages the full lifecycle of extension plugins.
 */
export class PluginEngine {
  private _plugins: PluginClient[] = [];
  private readonly disposables: Disposable[] = [];

  constructor(private readonly config: PluginEngineConfig) {}

  get plugins() {
    return this._plugins;
  }

  /** Discovers, registers and enables plugins. */
  async activate(): Promise<void> {
    try {
      const configs = await this.locate();
      configs.forEach((c) => (c.sysl = this.config.sysl));
      this._plugins = this.build(configs);
      this.plugins.forEach((p) => p.start());
      if (this._plugins.length) {
        this.disposables.push(this.config.events.register());
      }

      this.config.events.onDidSaveTextDocument(async (e: DocumentChangeEvent) => {
        const model = await this.config.sysl?.protobufFromSource(
          e.document.getText(),
          e.document.uri.fsPath
        );
      });
    } catch (e) {
      console.error(`Error activating plugins: ${e}`);
    }
  }

  deactivate() {
    this.plugins.forEach((p) => p.stop());
    this.disposables.forEach((d) => d.dispose());
  }

  /** Locates available plugins and returns a config for each. */
  async locate(): Promise<PluginConfig[]> {
    const { sysl, extensionPath, workspaceDirs, remoteUrl, globalStoragePath, options } =
      this.config;
    // TODO: Make more flexible.
    if (!sysl || !extensionPath || !workspaceDirs || !remoteUrl || !globalStoragePath || !options) {
      throw new Error("All config required for plugin location");
    }
    return await PluginLocator.all(
      sysl,
      extensionPath,
      workspaceDirs,
      remoteUrl,
      globalStoragePath,
      options
    );
  }

  /** Constructs plugin clients for each config. */
  build(configs: PluginConfig[]): PluginClient[] {
    const factory = new PluginFactory(this.config.events);
    return configs.map((config) => factory.create(config));
  }

  get pluginIds(): string[] {
    return this.plugins.map((p) => p.id || "(no id)");
  }
}
