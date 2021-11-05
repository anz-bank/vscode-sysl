import { ViewModelChangeEvent } from "../events";
import { DiagramModel } from "./model";

export type DiagramModelChangeEvent<T, K> = ViewModelChangeEvent<
  DiagramModel,
  DiagramModelChange<T, K>
>;

/**
 * Encodes a change in a diagram model.
 */
export interface DiagramModelChange<T, K> {
  /**
   * Object containing the modified Model#modelData.
   */
  modelData?: T;
  /**
   * Array of node keys added. Any key included will also be included in the modifiedNodeData array.
   */
  insertedNodeKeys?: K[];
  /**
   * Array of node data objects modified.
   */
  modifiedNodeData?: T[];
  /**
   * Array of node keys deleted.
   */
  removedNodeKeys?: K[];
  /**
   * Array of link keys added. Any key included will also be included in the modifiedLinkData array.
   */
  insertedLinkKeys?: K[];
  /**
   * Array of link data objects modified.
   */
  modifiedLinkData?: T[];
  /**
   * Array of link keys deleted.
   */
  removedLinkKeys?: K[];
}
