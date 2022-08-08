import { ViewKey, viewKeyToString } from "@anz-bank/vscode-sysl-model";

/**
 * A view edit represents edits that should be applied to a view's model.
 *
 * What the edit contains and how it is interpreted is up to the view.
 */
export type ViewEdit = SetEdit<any> | UpdateEdit<any>;

export type SetEdit<T> = {
  /** The model to set on a view. */
  model: T;
};

export type UpdateEdit<D> = {
  /** A change to apply to a view. */
  delta: D;
};

type ViewEditsEntry = {
  /** The view to edit. */
  key: ViewKey;
  /** The change to apply. */
  edit: ViewEdit;
};

/**
 * ViewEdits is a collection of changes for multiple views.
 *
 * Use the {@link views.applyEdit applyEdit} function to apply the changes.
 */
export class ViewEdits {
  /** The individual edits added to the batch. */
  private readonly _edits: ViewEditsEntry[] = [];

  /** The number of edit entries in the change set. */
  get size(): number {
    return this._edits.length;
  }

  /** The entries in the change set. */
  entries(): [ViewKey, ViewEdit[]][] {
    const edits: { [key: string]: [ViewKey, ViewEdit[]] } = {};
    this._edits.forEach((e) => {
      const k = viewKeyToString(e.key);
      edits[k] ??= [e.key, []];
      edits[k][1].push(e.edit);
    });
    return Object.values(edits);
  }

  /** Adds an edit to set the model of a view. */
  set<T>(key: ViewKey, model: T): ViewEdits {
    this._edits.push({ key, edit: { model } });
    return this;
  }

  /** Adds an edit to update the model of a view. */
  update<D>(key: ViewKey, delta: D): ViewEdits {
    this._edits.push({ key, edit: { delta } });
    return this;
  }

  toJSON(): [ViewKey, ViewEdit[]][] {
    return this.entries();
  }
}
