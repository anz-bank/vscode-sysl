import { URI } from "vscode-uri";
import { uriToViewKey, viewKeyToString } from "./key";

describe("view key to string", () => {
  test("empty", async () => {
    expect(viewKeyToString({} as any)).toEqual("view:/");
  });
  test("local doc", async () => {
    const docUri = "file:/foo/bar.sysl";
    expect(viewKeyToString({ docUri } as any)).toEqual(`view+${docUri}`);
  });
  test("remote doc", async () => {
    const docUri = "file://remote.com/foo/bar.sysl";
    expect(viewKeyToString({ docUri } as any)).toEqual(`view+${docUri}`);
  });
  test("full key", async () => {
    const docUri = "file://remote.com/foo/bar.sysl";
    expect(viewKeyToString({ docUri, pluginId: "foo", viewId: "bar" })).toEqual(
      `view+${docUri}?pluginId=foo&viewId=bar`
    );
  });
});

describe("uri to view key", () => {
  test("empty", async () => {
    expect(uriToViewKey(URI.parse(""))).toEqual({
      docUri: "file:///",
      pluginId: "",
      viewId: "",
    });
  });
  test("full key", async () => {
    const docUri = "file://remote.com/foo/bar.sysl";
    expect(uriToViewKey(URI.parse(`view+${docUri}?pluginId=foo&viewId=bar`))).toEqual({
      docUri,
      pluginId: "foo",
      viewId: "bar",
    });
  });
});
