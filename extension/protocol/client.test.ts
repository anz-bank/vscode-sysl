import { expect } from "chai";
import { CommandPluginClient } from "./client";

suite("plugin client", () => {
  const client = new CommandPluginClient("test", "Test", {
    run: { command: "extension/protocol/example/bin/example" },
  });

  test("construct", async () => {
    expect(client).to.be.not.null;
  });

  test("start", async () => {
    const res = await client.start();
    expect(res.error).to.be.undefined;
    expect(res.onchange).to.be.undefined;

    const diagrams = res.initialize!.capabilities!.diagrams!.availabilities!;
    expect(diagrams).to.have.length(1);
    expect(diagrams[0].type!.id!).equals("example");
  });

  test("stop", async () => {
    const res = await client.stop();
    expect(res.error).to.be.undefined;
  });

  test("on change", async () => {
    const res = await client.onChange({
      change: {
        filePath: "foo",
        action: "MODIFY",
        source: "TEXT",
      },
    });
    expect(res.error).to.be.undefined;
    expect(res.initialize).to.be.undefined;

    const diagrams = res.onchange!.renderDiagram!;
    expect(diagrams).to.have.length(1);
    expect(diagrams[0].type!.id).equals("example");
    expect(diagrams[0].content!.nodes![0].key).equals("a");
    expect(diagrams[0].content!.edges![0].key).equals("a->b");
  });
});
