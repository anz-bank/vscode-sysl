import { URI } from "vscode-uri";
import { expect } from "chai";
import { parseSnapshotEvent, SnapshotEvent, snapshotEventType } from "./snapshot";
import path from "path";

suite("snapshot", () => {
  suite("parse event", () => {
    const modelUri = URI.file(path.join(__dirname, "test.sysl"));

    test("no diagram name", () => {
      const event: SnapshotEvent = { type: snapshotEventType, data: "data" };
      const out = parseSnapshotEvent(event, modelUri);

      const { dir, base } = path.parse(out.path.fsPath);
      // fsPath lower-cases the drive letter on Windows, so give __dirname the same treatment.
      expect(dir).to.equal(URI.file(__dirname).fsPath);
      expect(base).to.match(/test-\d+-\d+-\d+T\d+-\d+-\d+\.svg/);
      expect(out.data.toString()).to.equal("data");
    });

    test("with diagram name", () => {
      const event: SnapshotEvent = { type: snapshotEventType, data: "data", name: "Foo Bar" };
      const out = parseSnapshotEvent(event, modelUri);

      const { dir, base } = path.parse(out.path.fsPath);
      // fsPath lower-cases the drive letter on Windows, so give __dirname the same treatment.
      expect(dir).to.equal(URI.file(__dirname).fsPath);
      expect(base).to.match(/test-foo_bar-\d+-\d+-\d+T\d+-\d+-\d+.svg/);
      expect(out.data.toString()).to.equal("data");
    });
  });
});