import { downloadPlugin } from "../tools/download";
import * as fs from "fs/promises";
import { flatten, last, map } from "lodash";
import path from "path";
import { ProgressLocation, window } from "vscode";
import { output } from "../constants";
import { Sysl } from "../tools/sysl";
import { File, PluginClientOptions, PluginConfig, PluginKind, PluginManifest } from "./types";

/** Name of the directory that may store Sysl metadata for a project. */
const syslMetaDir = ".sysl";

export type PluginFetchOptions = {
  /** Where to fetch plugins from. */
  remoteUrl?: string;
  /** Whether to require strict SSL when fetching network plugins. */
  strictSsl?: boolean;
};

/** Discovers available plugins on the user's machine and known network locations. */
export class PluginLocator {
  /** Returns all discoverable plugins in order of precedence. */
  static async all(
    sysl: Sysl,
    extensionPath: string,
    workspaceDirs: string[],
    globalStoragePath: string,
    options?: PluginClientOptions,
    fetchOptions?: PluginFetchOptions
  ): Promise<PluginConfig[]> {
    let networkPlugins: Promise<PluginConfig[]> = Promise.resolve([]);
    if (!fetchOptions?.remoteUrl) {
      output.appendLine(`Skipping fetch of network plugins because remote URL is empty`);
    } else if (!options?.workspaceConfig?.plugins?.fetchFromNetwork) {
      output.appendLine(
        `Skipping fetch of network plugins because the fetchFromNetwork setting is disabled`
      );
    } else {
      networkPlugins = this.networkPlugins(globalStoragePath, fetchOptions, options).catch(
        (err) => {
          window.showErrorMessage(
            `Failed to fetch plugins: ${err}.\n\nCheck your "Sysl › Plugins: Network Source
" setting, and reload this window to retry.`
          );
          return [];
        }
      );
    }

    return flatten(
      await Promise.all([
        this.localPlugins(sysl, workspaceDirs, options),
        this.builtin(extensionPath, options),
        networkPlugins,
      ])
    );
  }

  /** Returns all local plugins that can be discovered in the workspace. */
  static async localPlugins(
    sysl: Sysl,
    workspaceDirs: string[],
    options?: PluginClientOptions
  ): Promise<PluginConfig[]> {
    async function lspPlugins(dir: string): Promise<PluginConfig[]> {
      const scriptsPath = path.join(dir, syslMetaDir, "plugins");
      return (await dirsIn(scriptsPath)).map((dir) => {
        return {
          id: dir,
          scriptPath: path.join(dir, "index.js"),
          clientOptions: { ...options },
        } as PluginConfig;
      });
    }

    return flatten(
      await Promise.all(workspaceDirs.map(async (dir) => flatten([await lspPlugins(dir)])))
    );
  }

  /** Returns all plugins that are built into the extension. */
  static async builtin(
    extensionPath: string,
    options?: PluginClientOptions
  ): Promise<PluginConfig[]> {
    const pluginsDir = path.join(extensionPath, "dist", "plugins");
    const intPath = path.join(pluginsDir, "integration", "index.js");
    const erdPath = path.join(pluginsDir, "erd", "index.js");
    const sysldPath = path.join(pluginsDir, "sysld", "index.js");
    const clientOptions = { ...options, documentSelector: [{ scheme: "file", language: "sysl" }] };

    return [
      { id: "integration", scriptPath: intPath, clientOptions } as PluginConfig,
      { id: "edg", scriptPath: erdPath, clientOptions } as PluginConfig,
      {
        id: "sysld",
        scriptPath: sysldPath,
        clientOptions: { ...options, documentSelector: [{ scheme: "file", language: "sysld" }] },
      } as PluginConfig,
    ];
  }

  /** Returns all plugins that can be discovered on the network. */
  static async networkPlugins(
    globalStoragePath: string,
    fetchOptions: PluginFetchOptions,
    pluginOptions?: PluginClientOptions
  ): Promise<PluginConfig[]> {
    return window.withProgress<PluginConfig[]>(
      {
        location: ProgressLocation.Notification,
        title: "Initializing plugins",
        cancellable: true,
      },
      async (progress, token): Promise<PluginConfig[]> => {
        progress.report({ message: "Fetching manifest...", increment: 10 });

        const manifests = await resolvePlugins(
          globalStoragePath,
          fetchOptions!.remoteUrl!,
          pluginOptions,
          fetchOptions
        );
        return manifests.map((m) => ({
          id: m.id,
          scriptPath: m.entrypoint,
          clientOptions: pluginOptions,
        }));
      }
    );
  }
}

/**
 * Returns a list of plugins rooted at the plugin defined at `url`.
 *
 * Each plugin is downloaded and extracted to `dir`, and `archive`-kind plugins are recursively
 * resolved.
 */
export async function resolvePlugins(
  dir: string,
  url: string,
  options: PluginClientOptions = {},
  fetchOptions: PluginFetchOptions = {},
  urls: string[] = []
): Promise<PluginManifest[]> {
  const newUrls = [...urls, url];
  if (urls.includes(url)) {
    throw new Error(`Cyclical dependency between plugins: ${newUrls.join(" -> ")}`);
  }
  const dirName = path.join(dir, pluginDirName(url));
  const files = await downloadArchive(dirName, url, fetchOptions.strictSsl);
  const plugins = extractPlugins(dirName, files);
  const children = plugins.map(
    async (p): Promise<PluginManifest[]> =>
      p.kind === "archive" ? resolvePlugins(dir, p.entrypoint, options, fetchOptions, newUrls) : [p]
  );
  return flatten(await Promise.all(children));
}

/**
 * Returns an appropriate folder name for the content downloaded from `url`.
 *
 * The name may contain slashes, representing a path to a subdirectory.
 */
const pluginDirName = (url: string): string => {
  const name = last(url.split("/"))!;
  return decodeURIComponent(name.slice(0, -path.extname(name).length));
};

async function downloadArchive(
  dir: string,
  url: string,
  strictSsl: boolean = true
): Promise<File[]> {
  output.appendLine(`Downloading plugin from ${url} into ${dir}...`);
  try {
    return (await downloadPlugin(url, dir, strictSsl)) as File[];
  } catch (err) {
    console.error("Error downloading plugin", err);
    throw err;
  }
}

/** Returns an array of plugin manifests describing the plugins implemented by files. */
export function extractPlugins(dir: string, files: File[]): PluginManifest[] {
  const pkgJson = files.find((i) => i.path.endsWith("package.json"));
  if (!pkgJson) throw new Error(`no package plugins described by ${files.length} files`);

  const plugins: PluginManifest[] = [];
  const pkg = JSON.parse(pkgJson.data.toString());
  // `main` indicates an entrypoint to an LSP plugin.
  if (pkg.main) {
    plugins.push({
      id: pkg.name,
      version: pkg.version,
      entrypoint: path.resolve(dir, `package/${pkg.main}`),
      kind: "lsp.module",
    });
  }

  // `peerDependencies` reference child plugins that should be resolved.
  if (pkg.peerDependencies) {
    plugins.push(
      ...map(pkg.peerDependencies, (version, name) => {
        const uriName = encodeURIComponent(name);
        const registry = (pkg.publishConfig.registry as string).replace(/\/$/, "");
        return {
          id: name,
          version,
          kind: "archive" as PluginKind,
          entrypoint: [registry, uriName, "-", `${uriName}-${version}.tgz`].join("/"),
        };
      })
    );
  }
  return plugins;
}

async function dirsIn(dir: string): Promise<string[]> {
  try {
    await fs.access(dir); // Throws if the dir doesn't exists or isn't accessible.
    const files = await fs.readdir(dir, { withFileTypes: true });
    return files.filter((i) => i.isDirectory()).map((i) => path.join(dir, i.name));
  } catch (err) {
    return [];
  }
}
