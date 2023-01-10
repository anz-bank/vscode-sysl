import { Disposable } from "@anz-bank/vscode-sysl-model";
import { zip } from "lodash";
import { window } from "vscode";
import { Sysl } from "../tools/sysl";
import { PluginLocator } from "./locator";
import { LspPluginClient } from "./lsp_client";
import { Events, PluginClient, PluginClientOptions, PluginConfig } from "./types";

/** Configures the plugin engine. */
export type PluginEngineConfig = {
  sysl: Sysl;
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
  private nextInspectPort = 6051;

  constructor(private readonly config: PluginEngineConfig) {}

  get plugins() {
    return this._plugins;
  }

  /** Discovers, registers and enables plugins. */
  async activate(): Promise<void> {
    const configs = await this.locate();
    configs.forEach((c) => (this.config.sysl = this.config.sysl));
    this._plugins = this.build(configs);
    const starts = await Promise.allSettled(this.plugins.map((p) => p.start()));

    const fails = zip(this.plugins, starts).filter(([_, p]) => p!.status === "rejected");
    if (fails.length) {
      window.showErrorMessage(
        `Failed to start plugins: ${fails.map(([config]) => config!.id).join(", ")}`
      );
    }

    if (this.plugins.length > fails.length) {
      this.disposables.push(this.config.events.register());
    }
  }

  async deactivate(): Promise<void> {
    this.disposables.forEach((d) => d.dispose());
    await Promise.all(this.plugins.map((p) => p.stop()));
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
    const { sysl, events } = this.config;
    return configs.map(
      (config) =>
        new LspPluginClient(config, sysl, events, {
          inspectPort: this.nextInspectPort++,
        })
    );
  }

  get pluginIds(): string[] {
    return this.plugins.map((p) => p.id || "(no id)");
  }
}
