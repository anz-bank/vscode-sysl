import { ViewKey } from "@anz-bank/vscode-sysl-model";
import { ViewKind, ViewModel, ViewModelDelta } from "@anz-bank/vscode-sysl-plugin";
import { truncate } from "lodash";
import { views } from "..";
import { isDiagram } from "../diagram/model";
import { View, ViewSurface } from "../types";
import { WebModel, WebModelDelta } from "./model";
import { Webview } from "./webview";

/**
 * A view surface that renders onto a Webview.
 */
export class RawWebViewSurface implements ViewSurface<WebModel, WebModelDelta> {
  constructor(protected readonly webview: Webview, initialHtml?: string) {
    if (initialHtml != null) {
      this.webview.html = initialHtml;
    }
  }

  async setModel(model: WebModel): Promise<boolean> {
    this.webview.html = model.content;
    return true;
  }

  updateModel(): Promise<boolean> {
    throw new Error("not implemented, use setModel");
  }

  dispose() {
    this.webview.html = "";
  }
}

/**
 * A view surface that instructs a Webview to render via postMessage.
 */
export class WebViewSurface<T extends ViewModel, D extends ViewModelDelta>
  implements ViewSurface<T, D>
{
  constructor(protected readonly webview: Webview, initialHtml?: string) {
    if (initialHtml) {
      this.webview.html = initialHtml;
    }
  }

  async setModel(model: T): Promise<boolean> {
    if (isDiagram(model)) {
      const { nodes, edges, meta } = model;
      console.log("web view rendering", { nodes: nodes?.length, edges: edges?.length, meta });
    } else {
      console.log("web view rendering", truncate(model.toString()));
    }
    return this.webview.postMessage({ type: "render", model });
  }

  async updateModel(delta: any): Promise<boolean> {
    console.log("web view updating", truncate(delta.toString()));

    return this.webview.postMessage({ type: "update", delta });
  }

  dispose() {}
}

export class HtmlDocumentView implements View<WebModel, WebModelDelta> {
  selection: string | null = null;

  constructor(
    public readonly key: ViewKey,
    private readonly surface: WebViewSurface<WebModel, WebModelDelta>,
    public kind: ViewKind = "html"
  ) {}

  setModel(model: WebModel): Promise<boolean> {
    return this.surface.setModel(model);
  }

  async updateModel(delta: WebModelDelta): Promise<boolean> {
    return this.surface.updateModel(delta);
  }

  dispose() {
    views.acceptCloseView(this);
    this.surface.dispose();
  }
}
