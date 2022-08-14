/**
 * Describes an action that can be performed by a plugin.
 */
export type Action = {
  /** Identifier that should be globally unique across all actions. */
  id: string;
  /** Human-readable label for the action. */
  title: string;
  /** Group that the action belongs to (prefixed to the title in the UI). */
  category?: string;
};
