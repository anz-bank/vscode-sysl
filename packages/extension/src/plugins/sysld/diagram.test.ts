import { expect } from "chai";
import { buildModel } from "./diagram";

const model = {
  nodes: [
    {
      key: "a",
      label: "A",
    },
    {
      key: "b",
      label: "B",
    },
  ],
  links: [
    {
      from: "a",
      to: "b",
      key: "a->b",
    },
  ],
};

describe("Sysld plugin", () => {
  test("build diagram", async () => {
    expect(await buildModel(model)).to.deep.equal({
      nodes: [
        {
          key: "a",
          label: "A",
        },
        {
          key: "b",
          label: "B",
        },
      ],
      edges: [{ key: "a->b", from: "a", to: "b" }],
    });
  });
});
