import { expect } from "chai";
import { commands } from "vscode";
import * as constants from "../../constants";

suite("Contributions", () => {
  test("Commands are present", async () => {
    const cmds = await commands.getCommands();
    expect(cmds).contains(constants.installSyslLspCommand);
    expect(cmds).contains("sysl.renderDiagram");
  });
});
