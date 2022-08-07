/**
 * A model edit represents edits that should be applied to a model.
 *
 * What the edit contains and how it is interpreted is up to the model.
 */
export type ModelEdit = ModelSetEdit<any> | ModelUpdateEdit<any>;

export type ModelSetEdit<T> = {
  /** The model to set. */
  model: T;
};

export type ModelUpdateEdit<D> = {
  /** A change to apply. */
  delta: D;
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

  /** Adds an edit to set the model of a model. */
  set<T>(key: string, model: T): ModelEdits {
    this._edits.push({ key, edit: { model } });
    return this;
  }

  /** Adds an edit to update the model of a model. */
  update<D>(key: string, delta: D): ModelEdits {
    this._edits.push({ key, edit: { delta } });
    return this;
  }

  toJSON(): [string, ModelEdit[]][] {
    return this.entries();
  }
}
