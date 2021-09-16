import { commands, TextDocument, window } from "vscode";
import { expect } from "chai";
import path from "path";

import * as constants from "../../constants";
import { Fixtures, sleep } from "./helpers";

const testRoot = path.resolve(__dirname, "../../../extension/test");
const fixtures = new Fixtures(path.join(testRoot, "fixtures"));

suite("contributions", () => {
  let doc: TextDocument;

  setup(async function () {
    // Open a Sysl spec to activate the extension.
    doc = await fixtures.open("simple.sysl");
    await window.showTextDocument(doc, 1, false);
    // Allow the extension time to get registered.
    await sleep(500);
  });

  teardown(async function () {
    await commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("commands are present", async () => {
    const cmds = await commands.getCommands();
    expect(cmds).contains(constants.installSyslLspCommand);
    expect(cmds).contains("sysl.renderDiagram");
  });
});
