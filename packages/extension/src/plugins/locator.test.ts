import { expect } from "chai";
import path from "path";
import { Sysl } from "../tools/sysl";
import { PluginLocator } from "./locator";
import { CommandPluginConfig, LspPluginConfig } from "./plugin_config";

const mock = require("mock-fs");

const sysl = new Sysl("");

/** Downcasts to specific classes for inspection. */
function cast<T>(x: any) {
  return x as T;
}

describe("plugins", () => {
  afterEach(() => {
    mock.restore();
  });

  describe("locator", () => {
    test("builtin", async () => {
      const plugins = await PluginLocator.builtin(sysl, "root");

      expect((plugins[0] as LspPluginConfig).lsp.scriptPath).to.equal(
        path.normalize("root/dist/plugins/integration/index.js")
      );
      expect((plugins[1] as LspPluginConfig).lsp.scriptPath).to.equal(
        path.normalize("root/dist/plugins/erd/index.js")
      );
    });

    describe("local", () => {
      test("none", async () => {
        mock({ "workspace/foo.arraiz": "" });
        const plugins = await PluginLocator.localPlugins(sysl, ["workspace"]);

        expect(plugins).to.have.length(0);
      });

      test("single", async () => {
        mock({ "workspace/.sysl/plugins/foo.arraiz": "" });
        const plugins = cast<CommandPluginConfig[]>(
          await PluginLocator.localPlugins(sysl, ["workspace"])
        );

        expect(plugins.map((p) => p.command.runOptions.command)).to.deep.equal([
          path.normalize("workspace/.sysl/plugins/foo.arraiz"),
        ]);
      });

      test("multiple", async () => {
        mock({
          "workspace/.sysl/plugins/foo.arraiz": "",
          "workspace/.sysl/plugins/bar.arraiz": "",
          "workspace/.sysl/plugins/baz.arraiz": "",
        });
        const plugins = cast<CommandPluginConfig[]>(
          await PluginLocator.localPlugins(sysl, ["workspace"])
        );

        expect(plugins.map((p) => p.command.runOptions.command)).to.deep.equal([
          path.normalize("workspace/.sysl/plugins/bar.arraiz"),
          path.normalize("workspace/.sysl/plugins/baz.arraiz"),
          path.normalize("workspace/.sysl/plugins/foo.arraiz"),
        ]);
      });
    });

    describe("network", () => {
      // test("all", async () => {
      //   mock({ storage: {} });
      //   await PluginLocator.networkPlugins(sysl, "storage", "", {});
      // });
    });
  });
});
