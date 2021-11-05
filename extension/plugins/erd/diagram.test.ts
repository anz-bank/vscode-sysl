import { expect } from "chai";
import { buildModel } from "./diagram";

const mod = {
  apps: {
    App: {
      types: {
        Foo: {
          relation: {
            attrDefs: {
              f: { typeRef: { ref: { path: ["Bar"] } } },
            },
          },
        },
        Bar: {
          relation: {
            attrDefs: {
              g: { primitive: "int" },
            },
          },
        },
      },
    },
  },
};

suite("ERD plugin", () => {
  test("build diagram", async () => {
    expect(await buildModel(mod)).to.deep.equal({
      nodes: [
        {
          key: "App.Foo",
          label: "Foo",
          group: undefined,
          isGroup: false,
        },
        {
          key: "App.Bar",
          label: "Bar",
          group: undefined,
          isGroup: false,
        },
      ],
      edges: [{ key: "App.Foo->App.Bar", from: "App.Foo", to: "App.Bar" }],
    });
  });
});
