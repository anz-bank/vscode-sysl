/**
 * A model edit represents edits that should be applied to a model.
 *
 * What the edit contains and how it is interpreted is up to the model.
 * All models and deltas will be encoded as strings over the wire.
 */
export type ModelEdit = ModelSetEdit | ModelUpdateEdit;

export type ModelSetEdit = {
  /** The model to set. */
  model: string;
};

export type ModelUpdateEdit = {
  /** A change to apply. */
  delta: string;
};

type ModelEditsEntry = {
  /** The model to edit. */
  key: string;
  /** The change to apply. */
  edit: ModelEdit;
};

/**
 * ModelEdits is a collection of changes for multiple models.
 *
 * Use the {@link models.applyEdit applyEdit} function to apply the changes.
 */
export class ModelEdits {
  /** The individual edits added to the batch. */
  private readonly _edits: ModelEditsEntry[] = [];

  /** The number of edit entries in the change set. */
  get size(): number {
    return this._edits.length;
  }

  /** The entries in the change set. */
  entries(): [string, ModelEdit[]][] {
    const edits: { [key: string]: [string, ModelEdit[]] } = {};
    this._edits.forEach((e) => {
      const k = e.key;
      edits[k] ??= [e.key, []];
      edits[k][1].push(e.edit);
    });
    return Object.values(edits);
  }

  /** Adds an edit to set the model. */
  set(key: string, model: string): ModelEdits {
    this._edits.push({ key, edit: { model } });
    return this;
  }

  /** Adds an edit to update the model of a model. */
  update(key: string, delta: string): ModelEdits {
    this._edits.push({ key, edit: { delta } });
    return this;
  }

  toJSON(): [string, ModelEdit[]][] {
    return this.entries();
  }
}
