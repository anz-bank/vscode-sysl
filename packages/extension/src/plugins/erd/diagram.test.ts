import {
  Application,
  ElementRef,
  Field,
  Model,
  Primitive,
  Struct,
  Type,
  TypePrimitive,
} from "@anz-bank/sysl/model";
import { buildModel } from "./diagram";

const mod: Model = new Model({
  apps: [
    new Application({
      name: "App",
      children: [
        new Type("Foo", true, [new Field("f", new ElementRef([], "App", "Bar"))]),
        new Type("Bar", true, [new Field("g", new Primitive(TypePrimitive.INT))]),
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
