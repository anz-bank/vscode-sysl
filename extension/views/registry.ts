import { Disposable, ViewKey, viewKeyToString } from "@anz-bank/vscode-sysl-model";
import { ViewModel, ViewModelDelta } from "@anz-bank/vscode-sysl-plugin";
import { flatten, pull } from "lodash";
import { URI } from "vscode-uri";
import { Document } from "../plugins/types";
import { ViewEdit } from "./edits";
import { ViewEvent, ViewModelChangeEvent } from "./events";
import { MultiViewFactory } from "./multi";
import { MultiView } from "./multi/types";
import { View, Views } from "./types";

export type DocumentFinder = (docUri: URI) => Thenable<Document>;

/**
 * Records the views that have been rendered and exposes an API to manage them.
 *
 * Requires that {@link multiviewFactory} be set before creating new multi views. This is an
 * inelegant dependency injection to break a cyclic dependency.
 */
export class ViewRegistry implements Views {
  /** Map of view URI to all rendered instances. */
  private readonly views: { [key: string]: View<any, any>[] } = {};
  private readonly multiviews: { [key: string]: MultiView[] } = {};

  // TODO: Find a more elegant way to inject this.
  private _multiviewFactory: MultiViewFactory | undefined;
  private _docFinder: DocumentFinder | undefined;

  onDidOpenViewListeners: ((e: ViewEvent) => any)[] = [];
  onDidCloseViewListeners: ((e: ViewEvent) => any)[] = [];
  onDidShowViewListeners: ((e: ViewEvent) => any)[] = [];
  onDidHideViewListeners: ((e: ViewEvent) => any)[] = [];
  onDidChangeViewListeners: (<T, D>(e: ViewModelChangeEvent<T, D>) => any)[] = [];

  getAllViews(): View<any, any>[] {
    return flatten(Object.values(this.views));
  }

  /** Returns the list of views sharing {@code key}, or {@code undefined} if there are none. */
  getViews(key: ViewKey): View<any, any>[] | undefined {
    return this.views[viewKeyToString(key)];
  }

  getAllMultiViews(): MultiView[] {
    return flatten(Object.values(this.multiviews));
  }

  /**
   * Returns the list of multi views rendering the document with {@code docUri}, or {@code undefined}
   * if there are none.
   */
  getMultiViews(docUri: URI): MultiView[] | undefined {
    return this.multiviews[docUri.toString()];
  }

  private async buildEvent(view): Promise<ViewEvent> {
    const { key } = view;
    let document: Document | undefined;
    if (key.docUri) {
      document = await this._docFinder?.(URI.parse(key.docUri));
    }
    return { key, document };
  }

  /** Invoked by a view when it is opened. */
  async acceptOpenView<T, D>(view: View<T, D>): Promise<void> {
    const { key } = view;

    (this.views[viewKeyToString(key)] ??= []).push(view);

    const event = await this.buildEvent(view);
    this.onDidOpenViewListeners.forEach(async (f) => f(event));
  }

  /** Invoked by a view when it is shown. */
  async acceptShowView<T, D>(view: View<T, D>): Promise<void> {
    const event = await this.buildEvent(view);
    this.onDidShowViewListeners.forEach(async (f) => f(event));
  }

  /** Invoked by a view when it is hidden. */
  async acceptHideView<T, D>(view: View<T, D>): Promise<void> {
    const event = await this.buildEvent(view);
    this.onDidHideViewListeners.forEach(async (f) => f(event));
  }

  /** Invoked by a view when it is opened. */
  async acceptCloseView<T, D>(view: View<T, D>): Promise<void> {
    const key = view.key;
    const keyString = viewKeyToString(key);
    pull(this.views[keyString], view);
    if (!this.views[keyString]?.length) {
      delete this.views[keyString];
    }

    const event = await this.buildEvent(view);
    this.onDidCloseViewListeners.forEach(async (f) => f(event));
  }

  /** Invoked by a view when its model changes. */
  async acceptChangeView<T, D>(view: View<T, D>, change: D, model?: T): Promise<void> {
    const event = (await this.buildEvent(view)) as ViewModelChangeEvent<T, D>;
    event.change = change;
    event.model = model;
    this.onDidChangeViewListeners.forEach((f) => f(event));
  }

  /** Invoked by a multi view when it is opened. */
  acceptOpenMultiView(docUri: URI, multiView: MultiView): void {
    (this.multiviews[docUri.toString()] ??= []).push(multiView);
  }

  /** Invoked by a multi view when it is closed. */
  acceptCloseMultiView(multiview: MultiView): void {
    const docUri = multiview.uri.toString();
    pull(this.multiviews[docUri], multiview);
    if (!this.multiviews[docUri]?.length) {
      delete this.multiviews[docUri];
    }
  }

  onDidOpenView(listener: (e: ViewEvent) => any): Disposable {
    this.onDidOpenViewListeners.push(listener);
    return { dispose: () => pull(this.onDidOpenViewListeners, listener) };
  }

  onDidCloseView(listener: (e: ViewEvent) => any): Disposable {
    this.onDidCloseViewListeners.push(listener);
    return { dispose: () => pull(this.onDidCloseViewListeners, listener) };
  }

  onDidShowView(listener: (e: ViewEvent) => any): Disposable {
    this.onDidShowViewListeners.push(listener);
    return { dispose: () => pull(this.onDidShowViewListeners, listener) };
  }

  onDidHideView(listener: (e: ViewEvent) => any): Disposable {
    this.onDidHideViewListeners.push(listener);
    return { dispose: () => pull(this.onDidHideViewListeners, listener) };
  }

  onDidChangeView(
    listener: <T extends ViewModel, D extends ViewModelDelta>(e: ViewModelChangeEvent<T, D>) => any
  ): Disposable {
    this.onDidChangeViewListeners.push(listener);
    return { dispose: () => pull(this.onDidChangeViewListeners, listener) };
  }

  async openView<T extends ViewModel>(key: ViewKey, model?: T): Promise<View<T, any>[]> {
    // TODO: Allow multi views to be disabled. Just render a standalone view instead with
    // CustomEditorViewFactory.

    const docUri = URI.parse(key.docUri);

    // Existing multi views for this document.
    let multiviews = this.getMultiViews(docUri);
    // Create one if it doesn't exist yet.
    if (!this._multiviewFactory) {
      throw new Error("no factory set to create new multiview instance");
    }
    multiviews ??= [await this._multiviewFactory!.create(docUri)];
    // Add the child view to each multi view that doesn't already have it.
    return multiviews.filter((m) => !m.hasChild(key)).map((m) => m.addChild(key, model));
  }

  async applyEdit(viewEdits: [ViewKey, ViewEdit[]][]): Promise<boolean> {
    const calls: Promise<boolean>[] = [];
    viewEdits.forEach(([key, edits]) => {
      const views = this.views[viewKeyToString(key)];
      views?.forEach((view) =>
        edits.forEach((edit) => {
          "delta" in edit && calls.push(view.updateModel(edit.delta));
          "model" in edit && calls.push(view.setModel(edit.model));
        })
      );
    });
    return calls.every((r) => r);
  }

  set multiviewFactory(multiviewFactory: MultiViewFactory | undefined) {
    this._multiviewFactory = multiviewFactory;
  }

  set docFinder(docFinder: DocumentFinder | undefined) {
    this._docFinder = docFinder;
  }
}
