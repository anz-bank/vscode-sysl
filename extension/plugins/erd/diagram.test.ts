import {
  Application,
  AppName,
  Model,
  Primitive,
  Reference,
  Struct,
  Type,
  TypePrimitive,
} from "@anz-bank/sysl/model";
import { buildModel } from "./diagram";

const mod: Model = new Model({
  apps: [
    new Application({
      name: new AppName(["App"]),
      types: [
        new Type({
          discriminator: "!table",
          name: "Foo",
          value: new Struct([
            new Type({
              name: "f",
              value: new Reference({ appName: new AppName(["App"]), typeName: "Bar" }),
            }),
          ]),
        }),
        new Type({
          discriminator: "!table",
          name: "Bar",
          value: new Struct([new Type({ name: "g", value: new Primitive(TypePrimitive.INT) })]),
        }),
      ],
    }),
  ],
});

describe("ERD plugin", () => {
  test("build diagram", () => {
    expect(buildModel(mod)).resolves.toMatchObject({
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
