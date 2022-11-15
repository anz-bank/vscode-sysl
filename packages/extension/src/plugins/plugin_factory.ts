import { CommandPluginClient } from "./command_client";
import { LspPluginClient } from "./lsp_client";
import {
  CommandPluginConfig,
  LspPluginConfig,
  PluginConfig,
  TransformPluginConfig,
} from "./plugin_config";
import { SyslTransformPluginClient } from "./transform_client";
import { Events, PluginClient } from "./types";

/** Creates plugin clients based on config objects. */
export class PluginFactory {
  private nextInspectPort = 6051;
  constructor(private readonly events: Events) {}

  create(config: PluginConfig): PluginClient {
    if ("lsp" in config) {
      return this.createLsp(config as LspPluginConfig);
    } else if ("transform" in config) {
      return this.createTransform(config as TransformPluginConfig);
    } else if ("command" in config) {
      return this.createCommand(config as CommandPluginConfig);
    } else {
      throw new Error("unknown config type: " + JSON.stringify(config));
    }
  }

  createLsp(config: LspPluginConfig): PluginClient {
    return new LspPluginClient(config, this.events, {
      inspectPort: this.nextInspectPort++,
    });
  }

  createTransform(config: TransformPluginConfig): PluginClient {
    const { sysl, scriptPath, clientOptions } = config.transform;
    return new SyslTransformPluginClient(config.id, sysl, scriptPath, this.events, clientOptions);
  }

  createCommand(config: CommandPluginConfig): PluginClient {
    const { sysl, runOptions, clientOptions } = config.command;
    return new CommandPluginClient(config.id, sysl, runOptions, this.events, clientOptions);
  }
}
