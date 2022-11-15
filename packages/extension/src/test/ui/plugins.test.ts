import { expect } from "chai";
import { Test } from "mocha";
import path from "path";
import { commands, TextDocument, TextEditor, window } from "vscode";
import { allSettled, Diagram, Fixtures, Input, isActivated, Screenshot, sleep } from "./helpers";

/**
 * Test that diagram rendering plugins are detected and invoked by the extension.
 */
suite("plugins", function () {
  this.timeout(60000);

  const isReady = isActivated();

  // TODO: Enable when screenshot comparisons are reliable.
  const assertScreenshots = false;

  const testRoot = path.resolve(__dirname, "../../../src/test");
  const fixtures = new Fixtures(path.join(testRoot, "fixtures"));
  const screenshot = new Screenshot(path.join(testRoot, "screenshots"));
  const diagram = new Diagram();

  /** A function to reset fixtures after each test. */
  let resetFixtures: () => Promise<void>;

  let doc: TextDocument;
  let editor: TextEditor;

  setup(async function () {
    resetFixtures = fixtures.prepare(["simple.sysl"]);

    doc = await fixtures.open("simple.sysl");
    editor = await window.showTextDocument(doc, 1, false);

    // Wait until the extension activation is complete.
    await isReady;
  });

  teardown(async function () {
    await commands.executeCommand("workbench.action.closeAllEditors");
    await resetFixtures();
  });

  suite("builtin", async function () {
    test("initial render", async function () {
      await diagram.render();
      await sleep(5000);
      await diagram.selectTab("Integration");

      const data = await diagram.getData();
      expect(data.nodes).to.have.length(1);
      expect(data.edges).to.be.empty;

      assertScreenshots && (await screenshot.compareExpectWriteAndRestore(this.test as Test));
    });

    test("after edit", async function () {
      await diagram.render();
      await sleep(5000);
      await diagram.selectTab("Integration");

      await Input.into(editor, Input.appWithEmptyEndpoing("Foo"));
      await commands.executeCommand("workbench.action.files.save");

      await diagram.maximize();
      await allSettled();

      const data = await diagram.getData();
      expect(data.nodes).to.have.length(2);
      expect(data.edges).to.be.empty;

      assertScreenshots && (await screenshot.compareExpectWriteAndRestore(this.test as Test));
    });
  });

  suite("local diagram renderer", async function () {
    test("initial render", async function () {
      await diagram.renderFull();
      await diagram.selectTab("test_plugin");

      const data = await diagram.getData();
      expect(data.nodes).to.have.length(3);
      expect(data.edges).to.have.length(1);

      assertScreenshots && (await screenshot.compareExpectWriteAndRestore(this.test as Test));
    });
  });

  // Dynamically add local test cases to the suite if local config is detected.
  try {
    const indexPath = path.resolve(__dirname, "../../../.vscode-test/plugin_tests.json");
    const dynamic = require(indexPath);
    console.debug("adding tests from", dynamic);
    dynamic.forEach((configPath: any) => {
      configPath = path.resolve(path.dirname(indexPath), configPath);
      const { name, module, script, expected } = require(configPath);
      test(`dynamic: ${name}`, async function () {
        const resolve = (p: string) => path.resolve(path.dirname(configPath), p);
        const moduleName = path.basename(module);

        try {
          await fixtures.cp(resolve(module), moduleName);
          await fixtures.cp(resolve(script), `.sysl/diagram_renderers/${path.basename(script)}`);

          doc = await fixtures.open(moduleName);
          await window.showTextDocument(doc, 1, false);
          // Allow the extension time to get registered.
          await sleep(500);

          await diagram.renderFull();

          const data = await diagram.getData();
          expect(data.nodes).to.have.length(expected.nodes);
          expect(data.edges).to.have.length(expected.edges);
        } finally {
          fixtures.rm(moduleName);
        }
      });
    });
  } catch (e) {
    console.debug("no additional local plugin tests detected");
  }
});
