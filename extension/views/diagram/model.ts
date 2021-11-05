import { ViewModel } from "../types";

// Need an equivalent of a Range within some arbitrary model for incremental changes.
export interface DiagramObjectData {}
export interface DiagramObjectKey {}

export type GoJSDiagramModel = DiagramModel;

export interface DiagramModel<N = DiagramObjectData, E = DiagramObjectData> extends ViewModel {
  nodes: N[];
  edges: E[];
  templates?: {
    diagramLabel: string;
    diagramLayout?: any;
    nodes?: { [key: string]: any };
    groups?: { [key: string]: any };
    edges?: { [key: string]: any };
  };
}

// TODO: Make this check more strict when plugins are more consistent.
export function isDiagram(model: any): model is DiagramModel {
  return "nodes" in model;
}
