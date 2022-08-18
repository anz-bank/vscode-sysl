import { Application, AppName, Call, Endpoint, Model, Statement } from "@anz-bank/sysl/model";
import { expect } from "chai";
import { buildModel } from "./diagram";

const model = new Model({
  apps: [
    new Application({
      name: new AppName(["Foo"]),
      endpoints: [
        new Endpoint({
          name: "E",
          statements: [
            new Statement({
              value: new Call({ originApp: ["Foo"], targetApp: ["Bar"], endpoint: "B" }),
            }),
          ],
        }),
      ],
    }),
    new Application({
      name: new AppName(["Bar"]),
    }),
  ],
});

describe("ERD plugin", () => {
  test("build diagram", async () => {
    expect(await buildModel(model)).to.deep.equal({
      nodes: [
        {
          key: "Foo",
          label: "Foo",
          group: undefined,
          isGroup: false,
        },
        {
          key: "Bar",
          label: "Bar",
          group: undefined,
          isGroup: false,
        },
      ],
      edges: [{ key: "Foo->Bar", from: "Foo", to: "Bar" }],
      templates: {
        diagramLabel: "Integration",
        diagramLayout: "ForceDirectedLayout",
      },
    });
  });
});
