/**
 * From https://github.com/NorthwoodsSoftware/gojs-react-basic/blob/master/src/App.tsx
 */

import { DiagramData } from "./DiagramTypes";

export class GoJSIndex {
  mapNodeKeyIdx: Map<go.Key, number>;
  mapLinkKeyIdx: Map<go.Key, number>;

  constructor({ nodes, edges }: { nodes?: Array<go.ObjectData>; edges?: Array<go.ObjectData> }) {
    this.mapNodeKeyIdx = new Map<go.Key, number>();
    this.mapLinkKeyIdx = new Map<go.Key, number>();

    nodes && this.refreshNodeIndex(nodes);
    edges && this.refreshLinkIndex(edges);
  }

  /**
   * Update map of node keys to their index in the array.
   */
  refreshNodeIndex(nodeArr: Array<go.ObjectData>) {
    this.mapNodeKeyIdx.clear();
    nodeArr.forEach((n: go.ObjectData, idx: number) => {
      this.mapNodeKeyIdx.set(n.key, idx);
    });
  }

  /**
   * Update map of link keys to their index in the array.
   */
  refreshLinkIndex(linkArr: Array<go.ObjectData>) {
    this.mapLinkKeyIdx.clear();
    linkArr.forEach((l: go.ObjectData, idx: number) => {
      this.mapLinkKeyIdx.set(l.key, idx);
    });
  }
}

/**
 * Returns true if it appears that a notification of a model change should be broadcast to the world
 * (e.g. if it results from a user interaction).
 * @param index The index of the currently known nodes and edges.
 * @param delta The content of the change.
 */
export function shouldNotifyChange(index: GoJSIndex, delta: go.IncrementalData) {
  const justSet =
    delta.insertedNodeKeys?.length === index.mapNodeKeyIdx.size &&
    delta.insertedLinkKeys?.length === index.mapLinkKeyIdx.size;
  return !justSet;
}

export function updateState(ix: GoJSIndex, draft: DiagramData, obj: go.IncrementalData): void {
  const insertedNodeKeys = obj.insertedNodeKeys;
  const modifiedNodeData = obj.modifiedNodeData;
  const removedNodeKeys = obj.removedNodeKeys;
  const insertedLinkKeys = obj.insertedLinkKeys;
  const modifiedLinkData = obj.modifiedLinkData;
  const removedLinkKeys = obj.removedLinkKeys;

  // maintain maps of modified data so insertions don't need slow lookups
  const modifiedNodeMap = new Map<go.Key, go.ObjectData>();
  const modifiedLinkMap = new Map<go.Key, go.ObjectData>();

  let narr = draft.nodes;
  if (modifiedNodeData) {
    modifiedNodeData.forEach((nd: go.ObjectData) => {
      modifiedNodeMap.set(nd.key, nd);
      const idx = ix.mapNodeKeyIdx.get(nd.key);
      if (idx !== undefined && idx >= 0) {
        narr[idx] = nd;
        if (draft.selected && draft.selected.key === nd.key) {
          draft.selected = nd;
        }
      }
    });
  }
  if (insertedNodeKeys) {
    insertedNodeKeys.forEach((key: go.Key) => {
      const nd = modifiedNodeMap.get(key);
      const idx = ix.mapNodeKeyIdx.get(key);
      if (nd && idx === undefined) {
        // nodes won't be added if they already exist
        ix.mapNodeKeyIdx.set(nd.key, narr.length);
        narr.push(nd);
      }
    });
  }
  if (removedNodeKeys) {
    narr = narr.filter((nd: go.ObjectData) => {
      if (removedNodeKeys.includes(nd.key)) {
        return false;
      }
      return true;
    });
    draft.nodes = narr;
    ix.refreshNodeIndex(narr);
  }

  let larr = draft.edges;
  if (modifiedLinkData) {
    modifiedLinkData.forEach((ld: go.ObjectData) => {
      modifiedLinkMap.set(ld.key, ld);
      const idx = ix.mapLinkKeyIdx.get(ld.key);
      if (idx !== undefined && idx >= 0) {
        larr[idx] = ld;
        if (draft.selected && draft.selected.key === ld.key) {
          draft.selected = ld;
        }
      }
    });
  }
  if (insertedLinkKeys) {
    insertedLinkKeys.forEach((key: go.Key) => {
      const ld = modifiedLinkMap.get(key);
      const idx = ix.mapLinkKeyIdx.get(key);
      if (ld && idx === undefined) {
        // links won't be added if they already exist
        ix.mapLinkKeyIdx.set(ld.key, larr.length);
        larr.push(ld);
      }
    });
  }
  if (removedLinkKeys) {
    larr = larr.filter((ld: go.ObjectData) => {
      if (removedLinkKeys.includes(ld.key)) {
        return false;
      }
      return true;
    });
    draft.edges = larr;
    ix.refreshLinkIndex(larr);
  }
  draft.skipsDiagramUpdate = true; // the GoJS model already knows about these updates
  draft.resetsDiagram = false;
}
