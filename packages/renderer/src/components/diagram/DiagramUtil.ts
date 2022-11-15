import * as go from "gojs";
import { DiagramData } from "./DiagramTypes";

export function diagramToData(diagram: go.Diagram): DiagramData {
  return {
    nodes: toArray(diagram.nodes).map((i) => i.data),
    edges: toArray(diagram.links).map((i) => i.data),
  };
}

/** Converts a GoJS iterator to a regular array. */
function toArray<T>(it: go.Iterator<T>): T[] {
  const arr: T[] = [];
  while (it.next()) {
    arr.push(it.value);
  }
  return arr;
}

/**
 * Convert Go.js points to a rounded string representation.
 *
 * @param pt The Go.js point to convert.
 */
export function stringifyPoint(pt: go.Point) {
  return go.Point.stringify(new go.Point(Math.round(pt.x), Math.round(pt.y)));
}
