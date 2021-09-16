import path from "path";
import { expect } from "chai";
import { Sysl } from "./sysl";

const root = path.resolve(__dirname, "../..");
const fixture = (relativePath: string): string =>
  path.join(root, "extension", "test", "fixtures", relativePath);

suite("Sysl", () => {
  const sysl = new Sysl("sysl");

  test("works", async () => {
    const pb = await sysl.protobufJson(fixture("simple.sysl"));
    expect(pb.apps).to.have.keys(["App"]);
    expect(pb.apps.App.name.part).to.deep.equal(["App"]);
  });
});
