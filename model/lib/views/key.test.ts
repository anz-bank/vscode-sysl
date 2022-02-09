import { expect } from "chai";
import { URI } from "vscode-uri";
import { uriToViewKey, viewKeyToString } from "./key";

suite("view key to string", () => {
  test("empty", async () => {
    expect(viewKeyToString({} as any)).to.equal("view:/");
  });
  test("local doc", async () => {
    const docUri = "file:/foo/bar.sysl";
    expect(viewKeyToString({ docUri } as any)).to.equal(`view+${docUri}`);
  });
  test("remote doc", async () => {
    const docUri = "file://remote.com/foo/bar.sysl";
    expect(viewKeyToString({ docUri } as any)).to.equal(`view+${docUri}`);
  });
  test("full key", async () => {
    const docUri = "file://remote.com/foo/bar.sysl";
    expect(viewKeyToString({ docUri, pluginId: "foo", viewId: "bar" })).to.equal(
      `view+${docUri}?pluginId=foo&viewId=bar`
    );
  });
});

suite("uri to view key", () => {
  test("empty", async () => {
    expect(uriToViewKey(URI.parse(""))).to.deep.equal({
      docUri: "file:///",
      pluginId: "",
      viewId: "",
    });
  });
  test("full key", async () => {
    const docUri = "file://remote.com/foo/bar.sysl";
    expect(uriToViewKey(URI.parse(`view+${docUri}?pluginId=foo&viewId=bar`))).to.deep.equal({
      docUri,
      pluginId: "foo",
      viewId: "bar",
    });
  });
});
