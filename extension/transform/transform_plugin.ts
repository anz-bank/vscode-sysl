import { PluginClient, PluginClientOptions } from "../protocol/client";
import { Response, OnChangeRequest, Diagram } from "../protocol/plugin";
import { Sysl } from "../tools/sysl";

/** Generates diagrams by running {@code sysl transform} with a script. */
export class SyslTransformPluginClient implements PluginClient<Response> {
  constructor(
    private readonly sysl: Sysl,
    private readonly _scriptPath: string,
    private readonly clientOptions?: PluginClientOptions
  ) {}

  start(): Promise<Response> {
    return Promise.resolve({ initialize: {} });
  }

  stop(): Promise<Response> {
    return Promise.resolve({});
  }

  async onChange(change: OnChangeRequest): Promise<Response> {
    // Only consider file save events, since the transform must read from disk.
    // TODO: Make sysl transform accept bytes to stdin.
    if (change.change?.action !== "SAVE_FILE") {
      return { onchange: {} };
    }

    const syslPath = change.context!.filePath!;
    try {
      let output = JSON.parse(await this.sysl.transform(syslPath, this.scriptPath));
      if (!Array.isArray(output)) {
        output = [output];
      }
      const diagrams = output
        .filter((data) => "nodes" in data)
        .map((content) => ({ content } as Diagram));
      if (output.length) {
        return {
          onchange: {
            renderDiagram: diagrams,
          },
        };
      }
      return { onchange: {} };
    } catch (e: any) {
      return { error: { message: e.toString() } };
    }
  }

  public get scriptPath(): string {
    return this._scriptPath;
  }
}
