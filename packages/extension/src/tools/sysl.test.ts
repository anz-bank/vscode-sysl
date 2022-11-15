import path from "path";
import { expect } from "chai";
import { SyslDownloader } from "./sysl_download";
import { Sysl } from "./sysl";

const rootPath = path.resolve(__dirname, "../../../..");
const fixtureDir = path.join(rootPath, "packages", "extension", "src", "test", "fixtures");
const fixture = (relativePath: string): string => path.join(fixtureDir, relativePath);

describe("Sysl", () => {
  let sysl: Sysl;

  beforeAll(async () => {
    sysl = await new SyslDownloader().localSysl(rootPath);
  });

  test("works", async () => {
    const pb = JSON.parse((await sysl.protobuf(fixture("simple.sysl"))).toString("utf-8"));
    expect(pb.apps).to.have.keys(["App"]);
    expect(pb.apps.App.name.part).to.deep.equal(["App"]);
  });

  test("version", async () => {
    const version = await sysl.version();
    expect(version).to.be.not.empty;
  });
});
