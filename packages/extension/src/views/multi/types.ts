import { Disposable, ViewKey } from "@anz-bank/vscode-sysl-model";
import { ViewModel, ViewModelDelta } from "@anz-bank/vscode-sysl-plugin";
import { URI } from "vscode-uri";
import { View } from "../types";

/** A container for multiple child views. */
export interface MultiView extends Disposable {
  /** The URI of the document rendered by the multi view. */
  readonly uri: URI;

  /** The child views of the multi view */
  readonly children: readonly View<any, any>[];

  /** Returns {@code true} if the multi view already contains a child view with {@code key}. */
  hasChild(key: ViewKey): boolean;

  /** Returns the child view with {@code key} if it exists, or {@code undefined} otherwise. */
  getChild<T extends ViewModel, D extends ViewModelDelta>(key: ViewKey): View<T, D> | undefined;

  /**
   * Creates a new child view with {@code key} and optionally an initial model. Returns the view
   * once created, initialized and added as a child of the multi view.
   *
   * If the view already exists within the multi view, throws an error to enforce consistency.
   */
  addChild<T extends ViewModel, D extends ViewModelDelta>(
    key: ViewKey,
    initialModel?: T
  ): View<T, D>;

  /** Removes and returns the child view with the given key if it exists, or undefined otherwise. */
  removeChild<T extends ViewModel, D extends ViewModelDelta>(key: ViewKey): View<T, D> | undefined;
}
