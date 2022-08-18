import { ViewKey, viewKeyToString } from "@anz-bank/vscode-sysl-model";
import { ViewModel, ViewModelDelta } from "@anz-bank/vscode-sysl-plugin";
import { each, set } from "lodash";
import { URI } from "vscode-uri";
import { views } from "..";
import { SnapshotEvent, Snapshotter } from "../../editor/snapshot";
import { SurfaceView, View, ViewSurface } from "../types";
import { WebViewSurface } from "../web/views";
import { Webview, WebviewEvent } from "../web/webview";
import { MultiModel } from "./model";
import { rendererHtml } from "./renderer";
import { MultiView } from "./types";

/** Renders multiple child views. */
export abstract class AbstractMultiView implements MultiView {
  protected readonly _children: { [key: string]: View<any, any> } = {};

  constructor(readonly uri: URI) {}

  get children(): readonly View<any, any>[] {
    return Object.values(this._children);
  }

  /** Returns {@code true} if the multiview already contains a child view with {@code key}. */
  public hasChild(key: ViewKey): boolean {
    return viewKeyToString(key) in this._children;
  }

  /** Returns the child view with {@code key} if it exists, or {@code undefined} otherwise. */
  public getChild<T extends ViewModel, D extends ViewModelDelta>(
    key: ViewKey
  ): View<T, D> | undefined {
    console.trace("GET CHILD", key);
    return this._children[viewKeyToString(key)];
  }

  public abstract addChild<T extends ViewModel, D extends ViewModelDelta>(
    key: ViewKey,
    initialModel?: T
  ): View<T, D>;

  /** Removes and returns the child view with the given key if it exists, or undefined otherwise. */
  public removeChild<T extends ViewModel, D extends ViewModelDelta>(
    key: ViewKey
  ): View<T, D> | undefined {
    const view = this.getChild(key);
    if (view) {
      view.dispose();
      delete this._children[viewKeyToString(key)];
    }
    return view;
  }

  /** Cleans up the multiview's resources. */
  dispose() {
    each(this._children, (child, key) => {
      child.dispose();
      delete this._children[key];
    });
    views.acceptCloseMultiView(this);
  }
}

/** Renders multiple child views onto a Webview using the renderer. */
export class WebMultiView extends AbstractMultiView {
  private readonly surface: WebViewSurface<MultiModel<any>, any>;

  constructor(
    uri: URI,
    webview: Webview,
    private readonly basePath: string,
    private readonly snapshotter?: Snapshotter
  ) {
    super(uri);
    this.surface = new WebViewSurface(webview);
    this.initializeWebview(webview);
  }

  /**
   * Creates a new child view with {@code key} and optionally an initial model. Returns the view
   * once created, initialized and added as a child of the multiview.
   *
   * If the view already exists within the multiview, throws an error to enforce consistency.
   */
  public addChild<T extends ViewModel, D extends ViewModelDelta>(
    key: ViewKey,
    initialModel?: T
  ): View<T, D> {
    if (this.hasChild(key)) {
      throw new Error("Multiview already has child " + viewKeyToString(key));
    }

    const surface = this.surface;
    // Create a surface that, when set or updated, will send an appropriate message to the renderer
    // including the child's key in the `meta.key` field.
    const childSurface: ViewSurface<T, D> = {
      async setModel(model: T): Promise<boolean> {
        return surface.setModel(set(model, "meta.key", key));
      },

      async updateModel(delta: D): Promise<boolean> {
        return surface.updateModel(set(delta, "meta.key", key));
      },

      dispose() {},
    };

    const view = new SurfaceView<any, any>(key, childSurface, initialModel);
    this._children[viewKeyToString(key)] = view;
    views.acceptOpenView(view);
    return view;
  }

  /** Initializes the multiview's Webview with the renderer's HTML. */
  private initializeWebview(webview: Webview) {
    webview.options = { enableScripts: true };
    webview.html = rendererHtml(webview, this.basePath);

    webview.onDidReceiveMessage((e: WebviewEvent) => {
      console.log("received message from child", e);
      switch (e.type) {
        case "view/didOpen":
          if (!this.hasChild(e.key)) {
            console.log("view opened by renderer: ", e.key);
            // This will propagate the open notification to the relevant plugins.
            this.addChild(e.key, e.model);
          }
          break;
        case "view/didClose":
          if (!this.hasChild(e.key)) {
            console.log("view closed by renderer: ", e.key);
            // This will propagate the close notification to the relevant plugins.
            this.removeChild(e.key);
          }
          break;
        case "view/didChange": {
          const view = this.getChild(e.key);
          view && views.acceptChangeView(view, e.delta, e.model);
          break;
        }
        case "view/snapshot":
          this.snapshotter?.save(e as SnapshotEvent);
          break;
      }
    });
  }
}
