import { Application, CallStatement, ElementRef, Endpoint, Model } from "@anz-bank/sysl/model";
import { buildModel } from "./diagram";

const model = new Model({
  apps: [
    new Application("Foo", {
      children: [
        new Endpoint("E", {
          children: [
            new CallStatement(ElementRef.parse("Bar.B"), [], ElementRef.parse("Foo")),
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
