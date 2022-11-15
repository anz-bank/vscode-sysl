import { ViewKey, viewKeyToString } from "@anz-bank/vscode-sysl-model";
import { URI } from "vscode-uri";
import { MultiViewFactory } from ".";
import { views } from "..";
import { FakeView, View } from "../types";
import { AbstractMultiView } from "./views";

/** A factory for fake multi views. */
export class FakeMultiViewFactory implements MultiViewFactory {
  async create(docUri: URI): Promise<FakeMultiView> {
    const multiview = new FakeMultiView(docUri);
    views.acceptOpenMultiView(docUri, multiview);
    return multiview;
  }
}

/** A multi view that simply keeps track of its children without delegating to them. */
export class FakeMultiView extends AbstractMultiView {
  constructor(private readonly docUri: URI) {
    super(docUri);
  }

  public addChild(key: ViewKey, initialModel?: any): View<any, any> {
    if (this.hasChild(key)) {
      throw new Error("Multiview already has child " + viewKeyToString(key));
    }

    const view: View<any, any> = new FakeView(key);
    initialModel && view.setModel(initialModel);
    this._children[viewKeyToString(key)] = view;
    views.acceptOpenView(view);
    return view;
  }
}
