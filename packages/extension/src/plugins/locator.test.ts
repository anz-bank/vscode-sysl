import { readFile } from "fs/promises";
import path from "path";
import { Sysl } from "../tools/sysl";
import { extractPlugins, PluginLocator, resolvePlugins } from "./locator";
import { File, PluginConfig } from "./types";

const mock = require("mock-fs");

const sysl = new Sysl("");

describe("plugins", () => {
  afterEach(() => {
    mock.restore();
  });

  describe("locator", () => {
    test("builtin", async () => {
      const plugins = await PluginLocator.builtin("root");

      expect((plugins[0] as PluginConfig).scriptPath).toEqual(
        path.normalize("root/dist/plugins/integration/index.js")
      );
      expect((plugins[1] as PluginConfig).scriptPath).toEqual(
        path.normalize("root/dist/plugins/erd/index.js")
      );
    });

    describe("local", () => {
      test("none", async () => {
        mock({ "workspace/foo.arraiz": "" });
        const plugins = await PluginLocator.localPlugins(sysl, ["workspace"]);

        expect(plugins).toHaveLength(0);
      });
    });

    describe("extract plugins", () => {
      test("empty", () => {
        expect(() => extractPlugins("storage", [])).toThrow();
      });

      test("package", () => {
        mock({ storage: {} });
        const pkg = {
          name: "foo",
          version: "0.42.0",
          main: "index.js",
          publishConfig: {
            registry: "https://foo.bar/",
          },
          peerDependencies: {
            bar: "1.2.3",
          },
        };
        const files = [
          {
            data: Buffer.from(JSON.stringify(pkg)),
            path: "package/package.json",
            type: "file",
          },
          {
            data: Buffer.from(""),
            path: "package/dist/index.js",
            type: "file",
          },
        ] as File[];
        expect(extractPlugins("/storage", files)).toMatchObject([
          {
            id: "foo",
            version: "0.42.0",
            entrypoint: "/storage/package/index.js",
            kind: "lsp.module",
          },
          {
            id: "bar",
            version: "1.2.3",
            entrypoint: "https://foo.bar/bar/-/bar-1.2.3.tgz",
            kind: "archive",
          },
        ]);
      });
    });
  });
});
