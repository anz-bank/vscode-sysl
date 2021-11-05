import { Sysl } from "../tools/sysl";
import { Disposable } from "../views/types";
import { PluginLocator } from "./locator";
import { PluginConfig } from "./plugin_config";
import { PluginFactory } from "./plugin_factory";
import { PluginClient, PluginClientOptions, Events } from "./types";

/** Configures the plugin engine. */
export type PluginEngineConfig = {
  sysl?: Sysl;
  extensionPath?: string;
  workspaceDirs?: string[];
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
  async activate(): Promise<any[]> {
    const configs = await this.locate();
    this._plugins = this.build(configs);
    this.plugins.forEach((p) => p.start());

    if (this._plugins.length) {
      this.disposables.push(this.config.events.register());
    }
    return this.plugins;
  }

  deactivate() {
    this.plugins.forEach((p) => p.stop());
    this.disposables.forEach((d) => d.dispose());
  }

  /** Locates available plugins and returns a config for each. */
  async locate(): Promise<PluginConfig[]> {
    const { sysl, extensionPath, workspaceDirs, options } = this.config;
    // TODO: Make more flexible.
    if (!sysl || !extensionPath || !workspaceDirs || !options) {
      throw new Error("all config required for plugin location");
    }
    return await PluginLocator.all(sysl, extensionPath, workspaceDirs, options);
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
