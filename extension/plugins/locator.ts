import path from "path";
import * as fs from "fs";
import { Sysl } from "../tools/sysl";
import { flatten } from "lodash";
import { promisify } from "util";
import {
  CommandPluginConfig,
  LspPluginConfig,
  PluginConfig,
  TransformPluginConfig,
} from "./plugin_config";
import { PluginClientOptions } from "./types";

const exists = promisify(fs.exists);

const idFromFile = (file: string): string => path.parse(file).name;

/** Discovers available plugins on the user's machine and known network locations. */
export class PluginLocator {
  /** Returns all discoverable plugins in order of precedence. */
  static async all(
    sysl: Sysl,
    extensionPath: string,
    workspaceDirs: string[],
    options?: PluginClientOptions
  ): Promise<PluginConfig[]> {
    return flatten([
      await this.localPlugins(sysl, workspaceDirs, options),
      await this.builtin(sysl, extensionPath, options),
    ]);
  }

  /** Returns all local plugins that can be discovered in the workspace. */
  static async localPlugins(
    sysl: Sysl,
    workspaceDirs: string[],
    options?: PluginClientOptions
  ): Promise<PluginConfig[]> {
    async function dirsIn(dir: string): Promise<string[]> {
      if (!(await exists(dir))) {
        return [];
      }
      return (await promisify(fs.readdir)(dir, { withFileTypes: true }))
        .filter((i) => i.isDirectory())
        .map((i) => path.join(dir, i.name));
    }
    /** Returns the absolute path to each file in dir. */
    async function filesIn(dir: string): Promise<string[]> {
      if (!(await exists(dir))) {
        return [];
      }
      return (await promisify(fs.readdir)(dir, { withFileTypes: true }))
        .filter((i) => !i.isDirectory())
        .map((i) => path.join(dir, i.name));
    }

    async function commandPlugins(dir: string): Promise<PluginConfig[]> {
      const scriptsPath = path.join(dir, ".sysl", "plugins");
      return (await filesIn(scriptsPath)).map((script) => {
        const scriptName = path.parse(script).base;
        return {
          id: scriptName,
          command: {
            sysl,
            runOptions: { command: script },
            clientOptions: options,
          },
        } as CommandPluginConfig;
      });
    }

    async function transformPlugins(dir: string): Promise<PluginConfig[]> {
      const scriptsPath = path.join(dir, ".sysl", "diagram_renderers");
      return (await filesIn(scriptsPath)).map(
        (script) =>
          ({
            id: idFromFile(script),
            transform: {
              sysl,
              scriptPath: script,
              clientOptions: options,
            },
          } as TransformPluginConfig)
      );
    }

    async function lspPlugins(dir: string): Promise<PluginConfig[]> {
      const scriptsPath = path.join(dir, ".sysl", "plugins", "lsp");
      return (await dirsIn(scriptsPath)).map((dir: string) => {
        return {
          id: dir,
          lsp: {
            scriptPath: path.join(dir, "index.js"),
            clientOptions: options,
          },
        } as LspPluginConfig;
      });
    }

    return flatten(
      await Promise.all(
        workspaceDirs.map(async (dir) =>
          flatten([await commandPlugins(dir), await transformPlugins(dir), await lspPlugins(dir)])
        )
      )
    );
  }

  /** Returns all plugins that are built into the extension. */
  static async builtin(
    sysl: Sysl,
    extensionPath: string,
    options?: PluginClientOptions
  ): Promise<PluginConfig[]> {
    const pluginsDir = path.join(extensionPath, "extension", "plugins");
    const intPath = path.join(pluginsDir, "integration", "integration_model_plugin.arraiz");

    const erdPath = path.join(extensionPath, "out", "plugins", "erd", "index.js");

    return [
      {
        id: idFromFile(intPath),
        transform: {
          sysl,
          scriptPath: intPath,
          clientOptions: options,
        },
      } as TransformPluginConfig,
      {
        id: idFromFile(erdPath),
        lsp: {
          scriptPath: erdPath,
          serverOptions: {},
          clientOptions: options,
        },
      } as LspPluginConfig,
    ];
  }
}
