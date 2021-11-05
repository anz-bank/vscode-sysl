import { Change, Diagram, DiagramData, Response } from "../protocol/plugin";
import { Sysl } from "../tools/sysl";
import { CommandPluginClient, RunOptions } from "./command_client";
import { Document, Events, PluginClientOptions } from "./types";

/** Generates diagrams by running {@code sysl transform} with a script. */
export class SyslTransformPluginClient extends CommandPluginClient {
  constructor(
    id: string,
    sysl: Sysl,
    private readonly _scriptPath: string,
    events: Events,
    clientOptions?: PluginClientOptions
  ) {
    super(
      id,
      sysl,
      SyslTransformPluginClient.runOptions(sysl.path, _scriptPath),
      events,
      clientOptions
    );
  }

  protected async initialize(): Promise<void> {
    // No-op for Sysl transforms.
  }

  /** Returns the command client options to run the Sysl transform. */
  private static runOptions(syslPath: string, scriptPath: string): RunOptions {
    return {
      command: syslPath,
      args: ["transform", `--script=${scriptPath}`],
    };
  }

  protected async process(
    doc: Document,
    action: Change["action"],
    source: Change["source"],
    openIfNot: boolean = false
  ): Promise<void> {
    console.log(`transform: processing ${source} ${action} on ${doc.uri.fsPath}`);
    const output = await this.sysl.transformSource(doc.uri.fsPath, this._scriptPath, doc.getText());
    if (!output) {
      return;
    }

    let json = JSON.parse(output);
    if (!Array.isArray(json)) {
      json = [json];
    }

    const res: Response = { onchange: { renderDiagram: this.toDiagrams(json) } };
    await this.handleResponse(res, doc, openIfNot);
  }

  private toDiagrams(json: (DiagramData | any)[]): Diagram[] {
    return json
      .filter((data: DiagramData | any) => "nodes" in data)
      .map((content: DiagramData) => {
        const name = content.templates?.diagramLabel;
        return { content, type: { id: this.id, name } } as Diagram;
      });
  }
}
