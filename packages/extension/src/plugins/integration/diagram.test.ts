import { Application, Call, Endpoint, Model, Statement } from "@anz-bank/sysl/model";
import { buildModel } from "./diagram";

const model = new Model({
  apps: [
    new Application("Foo", {
      children: [
        new Endpoint("E", {
          statements: [
            new Statement(new Call({ originApp: ["Foo"], targetApp: ["Bar"], endpoint: "B" })),
          ],
        }),
      ],
    }),
    new Application("Bar", { children: [new Endpoint("B")] }),
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
