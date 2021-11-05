import { expect } from "chai";
import { URI } from "vscode-uri";
import { TestEvents } from "./events_test";
import { SimpleDocument } from "./types";
import { ExampleClient } from "./examples/spp-typescript/example_client";
import * as sinon from "sinon";
import { viewRegistry, views } from "../views";
import { FakeMultiViewFactory } from "../views/multi/factory_test";
import { localSysl } from "../tools/sysl_download";
import path from "path";

suite("command plugin client", () => {
  let client: ExampleClient;
  let events: TestEvents;
  let openView: sinon.SinonSpy;
  let applyEdit: sinon.SinonSpy;
  const fakeFactory = new FakeMultiViewFactory();

  setup(async () => {
    viewRegistry.multiviewFactory = fakeFactory;
    events = new TestEvents();
    client = new ExampleClient(await localSysl(path.resolve(__dirname, "../..")), events);

    openView = sinon.spy(views, "openView");
    applyEdit = sinon.spy(views, "applyEdit");
  });

  teardown(() => {
    openView.restore();
    applyEdit.restore();
  });

  test("construct", async () => {
    expect(client).to.be.not.null;
  });

  test("start", async () => {
    await client.start();
  });

  test("stop", async () => {
    await client.start();
    await client.stop();
  });

  suite("events", () => {
    const uri = URI.parse("file:/foo.sysl");
    const document = new SimpleDocument(uri, "App:\n  ...");

    setup(async () => {
      await client.start();
    });

    teardown(async () => {
      await client.stop();
      viewRegistry.getAllMultiViews().forEach((v) => {
        v.dispose();
      });
    });

    test("render", async () => {
      await events.simulateRender(document);

      expect(openView).is.calledWithMatch(
        { docUri: uri.toString() },
        { nodes: [{ key: "a" }, { key: "b" }] }
      );
      expect(applyEdit).is.not.called;
    });

    test("change without open", async () => {
      await events.simulateChangeTextDocument({ document });

      expect(openView).is.not.called;
      expect(applyEdit).is.not.called;
    });

    test("change with open", async () => {
      await events.simulateRender(document);

      await events.simulateChangeTextDocument({ document });

      expect(openView).is.calledOnce;
      expect(applyEdit).is.calledOnce;
    });
  });
});
