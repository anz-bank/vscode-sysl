import chai, { expect } from "chai";
import path from "path";
import * as sinon from "sinon";
import { URI } from "vscode-uri";
import { SyslDownloader } from "../tools/sysl_download";
import { viewRegistry, views } from "../views";
import { FakeMultiViewFactory } from "../views/multi/factory_test";
import { TestEvents } from "./events_test";
import { ExampleClient } from "./examples/spp-typescript/example_client";
import { SimpleDocument } from "./types";

import sinonChai from "sinon-chai";
chai.should();
chai.use(sinonChai);

const rootPath = path.resolve(__dirname, "../../../..");

describe("command plugin client", () => {
  let client: ExampleClient;
  let events: TestEvents;
  let openView: sinon.SinonSpy;
  let applyEdit: sinon.SinonSpy;
  const fakeFactory = new FakeMultiViewFactory();

  beforeEach(async () => {
    viewRegistry.multiviewFactory = fakeFactory;
    events = new TestEvents();
    client = new ExampleClient(await new SyslDownloader().localSysl(rootPath), events);

    openView = sinon.spy(views, "openView");
    applyEdit = sinon.spy(views, "applyEdit");
  });

  afterEach(() => {
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

  describe("events", () => {
    const uri = URI.parse("file:/foo.sysl");
    const document = new SimpleDocument(uri, "App:\n  ...");

    beforeEach(async () => {
      await client.start();
    });

    afterEach(async () => {
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
