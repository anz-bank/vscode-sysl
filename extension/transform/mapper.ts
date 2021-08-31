import { TextDocument } from "vscode";

export interface IncrementalData {
    modifiedNodeData: any[];
}

/**
 * Maps data between types native to VS Code and Sysl diagrams.
 */
export interface Mapper<T> {
    /** Produces a target model from the contents of a text document. */
    sourceToTarget(doc: TextDocument): Promise<T>;

    /** Produces a Sysl module describing the target model. */
    // targetToModule(m: T): Promise<any>;

    /**
     * Produces an edit to the workspace to reflect a change in the target model.
     *
     * @param oldModel The module that described the target before the change.
     * @param delta The change to the target model.
     * @returns The change to apply to workspace to reflect the change in the target model.
     */
    // targetDeltaToSource(oldModel: any, delta: DiagramModel): Promise<WorkspaceEdit>;
}

export type Node = {
    key: string;
    label: string;
};

export type Edge = {
    key: string;
    from: string;
    to: string;
};

export type DiagramModel = {
    nodes: Node[];
    edges: Edge[];
};
