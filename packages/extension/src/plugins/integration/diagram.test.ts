import { Application, Call, Endpoint, Model, Statement } from "@anz-bank/sysl/model";
import { buildModel } from "./diagram";

const model = new Model({
  apps: [
    new Application({
      name: "Foo",
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
      name: "Bar",
      endpoints: [new Endpoint({ name: "B" })],
    }),
  ],
});

describe("Integration diagram plugin", () => {
  test("build diagram", () => {
    expect(buildModel(model)).resolves.toMatchObject({
      nodes: [
        {
          key: "Foo",
          label: "Foo",
          isGroup: false,
        },
        {
          key: "Bar",
          label: "Bar",
          isGroup: false,
        },
      ],
      edges: [{ key: "Foo->Bar", from: "Foo", to: "Bar" }],
    });
  });
});
