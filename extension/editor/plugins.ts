import path from "path";
import { ExtensionContext, TextDocument, workspace } from "vscode";
import { Sysl } from "../tools/sysl";
import { DiagramModel, Mapper } from "../transform/mapper";
import { TransformMapper } from "../transform/transform";
import { flatten } from "lodash";

/** An adaptor for plugin executables that can be invoked by the extension. */
interface Plugin<T> extends Mapper<T> {}

/** Manages the location, fetching and invocation of plugins. */
export class PluginManager implements Plugin<any[]> {
  private plugins: Plugin<any>[];

  constructor(plugins: Plugin<any>[] = []) {
    this.plugins = plugins;
  }

  /** Invokes {@link Mapper.sourceToTarget} on each of the plugins and returns the results. */
  async sourceToTarget(doc: TextDocument): Promise<any[]> {
    const results = await Promise.all(
      this.plugins.map(async (p) => {
        try {
          return await p.sourceToTarget(doc);
        } catch (e) {
          // Just log and return nothing; this result will be filtered out.
          console.error(e);
        }
      })
    );
    return results.filter((result) => result);
  }
}

/** Functions to discover plugins. */
export class PluginLocator {
  /** Returns all discoverable plugins in order of precedence. */
  static async all(sysl: Sysl, ctx: ExtensionContext): Promise<Plugin<DiagramModel>[]> {
    return flatten([
      await this.localSyslDiagramRenderers(sysl),
      await this.builtinDiagramRenderers(sysl, ctx),
    ]);
  }

  /** Returns all local plugins that can be discovered in the workspace. */
  static async localSyslDiagramRenderers(sysl: Sysl): Promise<Plugin<DiagramModel>[]> {
    const scripts = await workspace.findFiles(".sysl/diagram_renderers/*.{arrai,arraiz}");
    return scripts.map((s) => new TransformMapper(sysl, s.fsPath));
  }

  /** Returns all plugins that are built into the extension. */
  static async builtinDiagramRenderers(
    sysl: Sysl,
    ctx: ExtensionContext
  ): Promise<Plugin<DiagramModel>[]> {
    const builtins = [
      path.join(
        ctx.extensionPath,
        "extension",
        "plugins",
        "integration",
        "integration_model_plugin.arraiz"
      ),
    ];
    return builtins.map((s) => new TransformMapper(sysl, s));
  }
}
