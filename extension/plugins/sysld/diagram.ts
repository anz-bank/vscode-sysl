import { DiagramModel, DiagramObjectData } from "../../views/diagram/model";

export async function buildModel(module: any): Promise<DiagramModel> {
  const nodes: DiagramObjectData[] = [];
  const edges: DiagramObjectData[] = [];
  if (module.nodes.length && module.links.length) {
    return {
      nodes: module.nodes,
      edges: module.links
    }
  }

  return { nodes, edges };
}
