import { expect } from "chai";
import path from "path";
import { commands, TextDocument, window } from "vscode";
import { Diagram, Fixtures, Screenshot, sleep } from "./helpers";

/**
 * Test that diagram rendering plugins are detected and invoked by the extension.
 */
suite("plugins", function () {
  this.timeout(20000);

  const testRoot = path.resolve(__dirname, "../../../extension/test");
  const fixtures = new Fixtures(path.join(testRoot, "fixtures"));
  const screenshot = new Screenshot(path.join(testRoot, "screenshots"));
  const diagram = new Diagram();

  /** A function to reset fixtures after each test. */
  let resetFixtures: () => Promise<void>;

  let doc: TextDocument;

  setup(async function () {
    await fixtures.mkdir(".sysl/diagram_renderers");

    resetFixtures = fixtures.prepare(["simple.sysl"]);

    doc = await fixtures.open("simple.sysl");
    await window.showTextDocument(doc, 1, false);
    // Allow the extension time to get registered.
    await sleep(500);
  });

  teardown(async function () {
    await commands.executeCommand("workbench.action.closeAllEditors");
    await fixtures.rm(".sysl/diagram_renderers");
    await resetFixtures();
  });

  suiteTeardown(async function () {
    await fixtures.rm(".sysl");
  });

  suite("diagram renderers", async function () {
    teardown(async function () {
      await diagram.closeOthers();
      await screenshot.ofDiagram(this.currentTest);
    });

    test("fake diagram", async function () {
      await fixtures.cp(
        "../diagram_renderers/test_plugin.arrai",
        ".sysl/diagram_renderers/test_plugin.arrai"
      );

      await diagram.render();

      const data = await diagram.getData();
      expect(data.nodes).to.have.length(3);
      expect(data.edges).to.have.length(1);
    });

    // TODO: Enable when multiple plugins are supported.
    test("multiple fake diagrams", async function () {
      await fixtures.cp(
        "../diagram_renderers/test_plugin.arrai",
        ".sysl/diagram_renderers/test_plugin.arrai"
      );
      await fixtures.cp(
        "../diagram_renderers/test_plugin_2.arrai",
        ".sysl/diagram_renderers/test_plugin_2.arrai"
      );

      await diagram.render();

      const data = await diagram.getData();
      expect(data.nodes).to.have.length(4);
      expect(data.edges).to.have.length(3);
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

          await diagram.render();
          await sleep(2000);

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
