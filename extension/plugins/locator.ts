import download from "download";
import * as fs from "fs";
import got, { CancelableRequest } from "got";
import { flatten } from "lodash";
import path from "path";
import { promisify } from "util";
import { ProgressLocation, window } from "vscode";
import { output } from "../constants";
import { Sysl } from "../tools/sysl";
import {
  CommandPluginConfig,
  LspPluginConfig,
  PluginConfig,
  TransformPluginConfig,
} from "./plugin_config";
import { PluginClientOptions, PluginManifest, PluginManifests } from "./types";

const exists = promisify(fs.exists);

const idFromFile = (file: string): string => path.parse(file).name;

const configFromFile = (file: string | undefined) => {
  let defaultConfig = { documentSelector: [{ scheme: "file", language: "sysl" }] };
  if (file && fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file).toString());
  }
  return defaultConfig;
};

/** Discovers available plugins on the user's machine and known network locations. */
export class PluginLocator {
  /** Returns all discoverable plugins in order of precedence. */
  static async all(
    sysl: Sysl,
    extensionPath: string,
    workspaceDirs: string[],
    remoteUrl: string,
    globalStoragePath: string,
    options?: PluginClientOptions
  ): Promise<PluginConfig[]> {
    return flatten([
      await this.localPlugins(sysl, workspaceDirs, options),
      await this.builtin(sysl, extensionPath, options),
      await this.networkPlugins(sysl, globalStoragePath, remoteUrl, options).catch((err) => {
        window.showErrorMessage(`Failed to fetch plugins: ${err}`);
        return [];
      }),
    ]);
  }

  /** Returns all local plugins that can be discovered in the workspace. */
  static async localPlugins(
    sysl: Sysl,
    workspaceDirs: string[],
    options?: PluginClientOptions
  ): Promise<PluginConfig[]> {
    const compatible = (filename: string): boolean => {
      const exe = filename.endsWith(".exe");
      return process.platform === "win32" ? exe : !exe;
    };

    async function commandPlugins(dir: string): Promise<PluginConfig[]> {
      const scriptsPath = path.join(dir, ".sysl", "plugins");
      return (await filesIn(scriptsPath)).filter(compatible).map((script) => {
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
        const config = configFromFile(path.join(dir, "config.json"));
        return {
          id: dir,
          lsp: {
            scriptPath: path.join(dir, "index.js"),
            clientOptions: { ...options, ...config },
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
    const intPath = path.join(extensionPath, "out", "plugins", "integration", "index.js");
    const erdPath = path.join(extensionPath, "out", "plugins", "erd", "index.js");
    const sysldPath = path.join(extensionPath, "out", "plugins", "sysld", "index.js");

    return [
      {
        id: "integration",
        lsp: {
          scriptPath: intPath,
          clientOptions: { ...options, documentSelector: [{ scheme: "file", language: "sysl" }] },
        },
      } as LspPluginConfig,
      {
        id: "edg",
        lsp: {
          scriptPath: erdPath,
          clientOptions: { ...options, documentSelector: [{ scheme: "file", language: "sysl" }] },
        },
      } as LspPluginConfig,
      {
        id: "sysld",
        lsp: {
          scriptPath: sysldPath,
          clientOptions: { ...options, documentSelector: [{ scheme: "file", language: "sysld" }] },
        },
      } as LspPluginConfig,
    ];
  }

  /** Returns all plugins that can be discovered on the network. */
  static async networkPlugins(
    sysl: Sysl,
    globalStoragePath: string,
    remoteUrl: string,
    options?: PluginClientOptions
  ): Promise<PluginConfig[]> {
    return window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: "Initializing plugins",
        cancellable: true,
      },
      async (progress, token) => {
        progress.report({ message: "Fetching manifest...", increment: 10 });

        const gotConfig = {
          // This timeout is to pass github runner on Windows environment.
          // FIXME: Adjust timeout if needed.
          timeout: 10000,
          // This can only be handled by an API behind internal DNS which is implicitly trusted.
          https: { rejectUnauthorized: false },
        };

        return new Promise((resolve, reject) => {
          const get = got.get(remoteUrl, gotConfig);
          (get.json() as CancelableRequest<PluginManifests>)
            .then(({ plugins }) => {
              progress.report({ message: "Processing plugins...", increment: 20 });
              this.parseManifest(sysl, globalStoragePath, remoteUrl, plugins, options).then(
                resolve
              );
            })
            .catch(reject);

          token.onCancellationRequested(() => {
            reject("Cancelled by user");
            get?.cancel();
          });
        });
      }
    );
  }

  /** Parses the Manifest to download plugins and/or return their configs. */
  static async parseManifest(
    sysl: Sysl,
    globalStoragePath: string,
    manifestPath: string,
    manifests: PluginManifest[],
    options?: PluginClientOptions
  ): Promise<PluginConfig[]> {
    let configs: PluginConfig[] = [];
    try {
      for (let i = 0; i < manifests.length; i++) {
        const plugin = manifests[i];
        const scriptPath = path.resolve(path.dirname(manifestPath), plugin.entrypoint);
        switch (plugin.kind) {
          case "command":
            configs.push({
              id: plugin.id,
              command: { sysl, runOptions: { command: scriptPath }, clientOptions: options },
            } as CommandPluginConfig);
            break;
          case "transform":
            configs.push({
              id: plugin.id,
              transform: { sysl, scriptPath, clientOptions: options },
            } as TransformPluginConfig);
            break;
          case "lsp.module":
            const config = configFromFile(plugin.config);
            configs.push({
              id: plugin.id,
              lsp: { scriptPath, clientOptions: { ...options, ...config } },
            } as LspPluginConfig);
            break;
          case "archive":
            const pluginPath: string = path.join(globalStoragePath, ".sysl", "plugins", plugin.id);
            // check if already downloaded (fetch from globalStorage)
            // if ((await filesIn(pluginPath)).length) {
            //   console.log(`plugin found at ${pluginPath}`);
            //   // expect this plugin config to be returned by another function that discovers plugins in global storage
            //   } else {
            //   // if not, download the plugin and store it in globalStorage
            //   console.log("plugin unavailable, downloading it now...");
            const pluginManifest = await downloadPlugin(pluginPath, plugin.entrypoint);
            // collect plugins generated from each manifest and combine them together
            configs.push(
              ...(await this.parseManifest(
                sysl,
                globalStoragePath,
                pluginPath,
                pluginManifest,
                options
              ))
            );
            // }
            break;
          default:
            throw new Error(`Invalid plugin kind: ${plugin.kind}`);
        }
      }
    } catch (e) {
      throw new Error(`Error parsing Manifest: ${e}`);
    } finally {
      return configs;
    }
  }
}

async function downloadPlugin(dir: string, url: string): Promise<PluginManifest[]> {
  output.appendLine(`Downloading plugin from ${url} into ${dir}...`);

  try {
    await promisify(fs.mkdir)(dir);
  } catch (e: any) {
    if (e.code === "EEXIST") {
      // Ignore error on mkdir for existing dir.
    }
  }

  let response;
  try {
    response = (await download(url, dir, { extract: true })) as any;
  } catch (err) {
    console.error("Error downloading plugin", err);
    throw err;
  }
  // extract manifest.json from the archive
  const manifest = response.find((i) => i.path === "manifest.json");
  const plugins: PluginManifest[] = JSON.parse(manifest.data.toString())?.plugins;
  plugins?.forEach((p: PluginManifest) => (p.entrypoint = path.resolve(dir, p.entrypoint)));
  return plugins;
}

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
