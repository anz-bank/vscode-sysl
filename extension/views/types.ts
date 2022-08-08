import { Disposable, ViewKey } from "@anz-bank/vscode-sysl-model";
import { ViewModel, ViewModelDelta } from "@anz-bank/vscode-sysl-plugin";
import { URI } from "vscode-uri";
import { views } from ".";
import { ViewEdit } from "./edits";
import { ViewEvent, ViewModelChangeEvent } from "./events";
import { MultiView } from "./multi/types";

/**
 * An abstract surface for a view to render onto.
 *
 * A view itself is also a surface, typically delegating rendering to a concrete ViewSurface.
 */
export interface ViewSurface<T extends ViewModel, D extends ViewModelDelta> extends Disposable {
  /**
   * Sets the content of the view model to {@code model}.
   */
  setModel(model: T): Promise<boolean>;

  /**
   * Modifies the content of the view model according to {@code delta}. Resolves to {@code false}
   * if the update cannot be applied, or {@code true} otherwise.
   */
  updateModel(delta: D): Promise<boolean>;
}

/**
 * The logical representation of a piece of custom UI presented to the user.
 *
 * All rendering instructions should go through the view's API. The particular surface that the view
 * renders to is an implementation detail.
 *
 * @param T The type of the view model.
 * @param D The type of the view model delta.
 */
export interface View<T extends ViewModel, D extends ViewModelDelta> extends ViewSurface<T, D> {
  /** The key of the view. */
  key: ViewKey;

  // /** The subset of the view model that is selected. */
  // selection: T | null;

  // /** The model rendered by the view. */
  // model?: T;

  /**
   * Sets the content of the view model to {@code model}.
   *
   * If the model is changed, an {@code onDidChangeView} event will be fired.
   */
  setModel(model: T): Promise<boolean>;

  /**
   * Modifies the content of the view model according to {@code delta}. Resolves to {@code false}
   * if the update cannot be applied, or {@code true} otherwise.
   *
   * If the model is changed, an {@code onDidChangeView} event will be fired.
   */
  updateModel(delta: D): Promise<boolean>;
}

/** A view that simply delegates calls to a {@link ViewSurface}. */
export class SurfaceView<T, D> implements View<T, D> {
  selection: T | null = null;

  constructor(
    public readonly key: ViewKey,
    private readonly surface: ViewSurface<T, D>,
    initialModel?: T
  ) {
    initialModel && this.setModel(initialModel);
  }

  async setModel(model: T): Promise<boolean> {
    return this.surface.setModel(model);
  }

  updateModel(delta: D): Promise<boolean> {
    return this.surface.updateModel(delta);
  }

  dispose() {
    views.acceptCloseView(this);
    this.surface.dispose();
  }
}

/** Fake view for testing. */
export class FakeView implements View<any, any> {
  constructor(readonly key: ViewKey) {}

  async setModel(): Promise<boolean> {
    return true;
  }
  async updateModel(): Promise<boolean> {
    return true;
  }
  dispose() {
    views.acceptCloseView(this);
  }
}

/**
 * The public API for view management and subscriptions.
 *
 * Analogous to {@code vscode}'s {@code workspace} or {@code window}. A singleton instance is
 * exported from {@code index.ts}.
 */
export interface Views {
  /** Subscribes listener to view open events. */
  onDidOpenView: (listener: (e: ViewEvent) => any) => Disposable;
  /** Subscribes listener to view close events. */
  onDidCloseView: (listener: (e: ViewEvent) => any) => Disposable;
  /** Subscribes listener to view show events. */
  onDidShowView: (listener: (e: ViewEvent) => any) => Disposable;
  /** Subscribes listener to view hide events. */
  onDidHideView: (listener: (e: ViewEvent) => any) => Disposable;
  /** Subscribes listener to view model change events. */
  onDidChangeView: (
    listener: <T extends ViewModel, D extends ViewModelDelta>(e: ViewModelChangeEvent<T, D>) => any
  ) => Disposable;

  // TODO: Remove from public API; these should be handled behind the scenes.
  acceptOpenView<T, D>(view: View<T, D>): void;
  acceptCloseView<T, D>(view: View<T, D>): void;
  acceptShowView<T, D>(view: View<T, D>): void;
  acceptHideView<T, D>(view: View<T, D>): void;
  acceptChangeView<T, D>(view: View<T, D>, change: D, model?: T): void;
  acceptOpenMultiView(docUri: URI, multiView: MultiView): void;
  acceptCloseMultiView(multiview: MultiView): void;

  getViews(key: ViewKey): View<any, any>[] | undefined;
  getMultiViews(docUri: URI): MultiView[] | undefined;
  openView: <T extends ViewModel>(key: ViewKey, model?: T) => Promise<View<T, any>[]>;
  applyEdit: (edit: [ViewKey, ViewEdit[]][]) => Promise<boolean>;
}
