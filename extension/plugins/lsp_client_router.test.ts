import chai, { expect } from "chai";
import sinon, { SinonSpyCall, SinonStubbedInstance } from "sinon";
import sinonChai from "sinon-chai";
chai.use(sinonChai);

import { ViewKey } from "@anz-bank/vscode-sysl-model";
import {
  ViewDidChangeNotification,
  ViewDidChangeParams,
  ViewDidCloseNotification,
  ViewDidCloseParams,
  ViewDidHideNotification,
  ViewDidHideParams,
  ViewDidOpenNotification,
  ViewDidOpenParams,
  ViewDidShowNotification,
  ViewDidShowParams,
  ViewEditNotification,
  ViewEditParams,
  ViewModel,
  ViewOpenNotification,
  ViewOpenParams,
} from "@anz-bank/vscode-sysl-plugin";
import { ProtocolNotificationType } from "vscode-languageserver-protocol";
import { ViewRegistry } from "../views/registry";
import { Views } from "../views/types";
import { LanguageClientSpy, LspPluginClientRouter } from "./lsp_client_router";

const key: ViewKey = {
  docUri: "file:/foo.sysl",
  pluginId: "test",
  viewId: "test",
};
const model: ViewModel = { meta: { key } };

export const fooType = new ProtocolNotificationType<any, void>("foo");

suite("LSP plugin client router", () => {
  let client: LanguageClientSpy;
  let views: SinonStubbedInstance<ViewRegistry>;
  let sent: any;

  setup(async () => {
    views = sinon.createStubInstance(ViewRegistry);
    views.getAllViews.returns([]);
    client = new LanguageClientSpy();
    sent = sinon.spy(client, "sendNotification");
    await new LspPluginClientRouter(views, client).start();
  });

  test("LanguageClient spy", () => {
    const fooListener = sinon.spy();
    client.onNotification(fooType, fooListener);
    client.acceptNotification(fooType, 42);
    expect(fooListener).to.be.called.calledOnceWithExactly(42);
  });

  test("plugin registration", () => {
    expect(client.listeners).to.have.keys(
      ViewOpenNotification.type.method,
      ViewEditNotification.type.method
    );
  });

  test("views registration", () => {
    expect(views.onDidOpenView).to.have.been.calledOnce;
    expect(views.onDidCloseView).to.have.been.calledOnce;
    expect(views.onDidShowView).to.have.been.calledOnce;
    expect(views.onDidHideView).to.have.been.calledOnce;
    expect(views.onDidChangeView).to.have.been.calledOnce;
  });

  suite("from server", () => {
    test("open view", async () => {
      const payload = { views: [{ key, model }] } as ViewOpenParams;
      client.acceptNotification(ViewOpenNotification.type, payload);
      expect(views.openView).to.have.been.calledWith(key, model);
    });

    test("edit view", async () => {
      const edits = [[key, [{ model }]]];
      const payload = { edits } as ViewEditParams;
      client.acceptNotification(ViewEditNotification.type, payload);
      expect(views.applyEdit).to.have.been.calledWith(edits);
    });
  });

  suite("from views", () => {
    test("did open view", () => {
      simulate(views.onDidOpenView).calledWith({ key });
      expect(sent).to.have.been.calledWith(ViewDidOpenNotification.type, {
        view: { key },
      } as ViewDidOpenParams);
    });

    test("did close view", () => {
      simulate(views.onDidCloseView).calledWith({ key });
      expect(sent).to.have.been.calledWith(ViewDidCloseNotification.type, {
        key,
      } as ViewDidCloseParams);
    });

    test("did show view", () => {
      simulate(views.onDidShowView).calledWith({ key });
      expect(sent).to.have.been.calledWith(ViewDidShowNotification.type, {
        key,
      } as ViewDidShowParams);
    });

    test("did hide view", () => {
      simulate(views.onDidHideView).calledWith({ key });
      expect(sent).to.have.been.calledWith(ViewDidHideNotification.type, {
        key,
      } as ViewDidHideParams);
    });

    test("did change view", () => {
      const delta = { foo: 42 };
      simulate(views.onDidChangeView).calledWith({ key, change: delta });
      expect(sent).to.have.been.calledWith(ViewDidChangeNotification.type, {
        key,
        modelChanges: [delta],
      } as ViewDidChangeParams<any>);
    });
  });
});

/** Returns a function to simulate the calling of {@link spyFunc} with given args. */
const simulate = (spyFunc: any) => ({
  calledWith: (...args: any[]) =>
    spyFunc.getCalls().forEach((call: SinonSpyCall) => call.firstArg(...args)),
});
