import path from "path";
import { expect } from "chai";
import { localSysl } from "./sysl_download";

const root = path.resolve(__dirname, "../..");
const fixture = (relativePath: string): string =>
  path.join(root, "extension", "test", "fixtures", relativePath);

suite("Sysl", async () => {
  const sysl = await localSysl(root);

  test("works", async () => {
    const pb = await sysl.protobufJson(fixture("simple.sysl"));
    expect(pb.apps).to.have.keys(["App"]);
    expect(pb.apps.App.name.part).to.deep.equal(["App"]);
  });
});
