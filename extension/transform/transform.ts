import { TextDocument } from "vscode";
import { Sysl } from "../tools/sysl";
import { DiagramModel, Mapper } from "./mapper";

/** Generates diagrams by running {@code sysl transform} with a script. */
export class TransformMapper implements Mapper<DiagramModel> {
    constructor(private readonly sysl: Sysl, private readonly scriptPath: string) {}

    async sourceToTarget(doc: TextDocument): Promise<DiagramModel> {
        const output = await this.sysl.transform(doc.fileName, this.scriptPath);
        return JSON.parse(output);
    }
}
