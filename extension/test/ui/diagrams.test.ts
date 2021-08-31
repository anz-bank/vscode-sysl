import { expect } from "chai";
import path from "path";
import { commands, TextDocument, TextEditor, window } from "vscode";
import { Diagram, Fixtures, Input, sleep } from "./helpers";

suite("Diagram rendering", function () {
  this.timeout(10000);

  const fixtures = new Fixtures(path.resolve(__dirname, "../../../extension/test/fixtures"));
  const diagram = new Diagram();

  /** A function to reset fixtures after each test. */
  let resetFixtures: () => Promise<void>;

  let doc: TextDocument;
  let editor: TextEditor;

  setup(async function () {
    resetFixtures = fixtures.prepare(["simple.sysl"]);

    doc = await fixtures.open("simple.sysl");
    editor = await window.showTextDocument(doc, 1, false);
    // Allow the extension time to get registered.
    await sleep(500);
  });

  teardown(async function () {
    await commands.executeCommand("workbench.action.closeAllEditors");
    await resetFixtures();
  });

  test("Render single app", async function () {
    await diagram.render();

    const data = await diagram.getData();
    expect(data.nodes).to.have.length(1);
    expect(data.edges).to.be.empty;
  });

  test("Render two apps", async function () {
    await diagram.render();

    await editor.edit((builder) => {
      builder.insert(Input.atEnd(editor), Input.emptyApp("Foo"));
    });
    await commands.executeCommand("workbench.action.files.save");
    await sleep(2000);

    const data = await diagram.getData();
    expect(data.nodes).to.have.length(2);
    expect(data.edges).to.be.empty;
  });
});
