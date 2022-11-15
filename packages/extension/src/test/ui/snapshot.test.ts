import { expect } from "chai";
import path from "path";
import { commands, TextDocument, window, workspace } from "vscode";
import { Diagram, Fixtures, sleep } from "./helpers";

/**
 * Test that the diagram editor can take snapshots.
 */
suite("snapshot", function () {
  this.timeout(20000);

  const testRoot = path.resolve(__dirname, "../../../src/test");
  const fixtureDir = path.join(testRoot, "fixtures");
  const fixtures = new Fixtures(fixtureDir);

  /** A function to reset fixtures after each test. */
  let resetFixtures: () => Promise<void>;

  let doc: TextDocument;

  setup(async function () {
    resetFixtures = fixtures.prepare(["simple.sysl"]);

    doc = await fixtures.open("simple.sysl");
    await window.showTextDocument(doc, 1, false);
    // Allow the extension time to get registered.
    await sleep(500);
  });

  test("save", async () => {
    await new Diagram().render();

    await commands.executeCommand("sysl.diagram.snapshot");
    // TODO: Instrument completion of the snapshot request.
    await new Promise((resolve) => setTimeout(resolve, 100));

    const snapshots = await fixtures.find("*.svg");

    expect(snapshots).to.have.length(1);
    const { dir, base } = path.parse(snapshots[0].fsPath);
    expect(dir).to.equal(fixtureDir);
    expect(base).to.match(/simple-integration-\d+-\d+-\d+T\d+-\d+-\d+\.svg/);
  });

  teardown(async function () {
    await commands.executeCommand("workbench.action.closeAllEditors");
    const snapshots = await fixtures.find("*.svg");
    await Promise.all(snapshots.map((s) => workspace.fs.delete(s)));
    await resetFixtures();
  });
});
