import path from "path";
import * as fs from "fs";
import { Sysl } from "../tools/sysl";
import { flatten } from "lodash";
import { promisify } from "util";
import { CommandPluginClient, PluginClient, PluginClientOptions } from "../protocol/client";
import { SyslTransformPluginClient } from "../transform/transform_plugin";

const exists = promisify(fs.exists);

/** Functions to discover plugins. */
export class PluginLocator {
  /** Returns all discoverable plugins in order of precedence. */
  static async all(
    sysl: Sysl,
    extensionPath: string,
    workspaceDirs: string[],
    options?: PluginClientOptions
  ): Promise<PluginClient[]> {
    return flatten([
      await this.localPlugins(sysl, workspaceDirs, options),
      await this.builtinDiagramRenderers(sysl, extensionPath, options),
    ]);
  }

  /** Returns all local plugins that can be discovered in the workspace. */
  static async localPlugins(
    sysl: Sysl,
    workspaceDirs: string[],
    options?: PluginClientOptions
  ): Promise<PluginClient[]> {
    /** Returns the absolute path to each file in dir. */
    async function filesIn(dir: string): Promise<string[]> {
      if (!(await exists(dir))) {
        return [];
      }
      return (await promisify(fs.readdir)(dir, { withFileTypes: true }))
        .filter((i) => !i.isDirectory())
        .map((i) => path.join(dir, i.name));
    }

    async function commandPlugins(dir: string): Promise<PluginClient[]> {
      const scriptsPath = path.join(dir, ".sysl", "plugins");
      const serverOptions = (f: string) => ({ run: { command: f, debug: true } });
      return (await filesIn(scriptsPath)).map(
        (script) => new CommandPluginClient(script, script, serverOptions(script), options)
      );
    }

    async function transformPlugins(dir: string): Promise<PluginClient[]> {
      const scriptsPath = path.join(dir, ".sysl", "diagram_renderers");
      return (await filesIn(scriptsPath)).map(
        (script) => new SyslTransformPluginClient(sysl, script, options)
      );
    }

    return flatten(
      await Promise.all(
        workspaceDirs.map(async (dir) =>
          flatten([await commandPlugins(dir), await transformPlugins(dir)])
        )
      )
    );
  }

  /** Returns all plugins that are built into the extension. */
  static async builtinDiagramRenderers(
    sysl: Sysl,
    extensionPath: string,
    options?: PluginClientOptions
  ): Promise<PluginClient[]> {
    const builtins = [
      path.join(
        extensionPath,
        "extension",
        "plugins",
        "integration",
        "integration_model_plugin.arraiz"
      ),
    ];
    const existence = await Promise.all(builtins.map(exists));
    return builtins
      .filter((_, i) => existence[i])
      .map((script) => new SyslTransformPluginClient(sysl, script, options));
  }
}
