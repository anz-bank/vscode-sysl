import { expect } from "chai";
import { CommandPluginClient } from "../protocol/client";
import { Sysl } from "../tools/sysl";
import { SyslTransformPluginClient } from "../transform/transform_plugin";
import { PluginLocator } from "./locator";

const mock = require("mock-fs");

const sysl = new Sysl("");

/** Downcasts to specific classes for inspection. */
function cast<T>(x: any) {
  return x as T;
}

suite("plugins", () => {
  teardown(() => {
    mock.restore();
  });

  suite("locator", () => {
    suite("builtin", () => {
      test("none", async () => {
        mock({ "root/extension/plugin.arraiz": "" });
        const plugins = await PluginLocator.builtinDiagramRenderers(sysl, "root");

        expect(plugins).to.have.length(0);
      });

      test("single", async () => {
        mock({ "root/extension/plugins/integration/integration_model_plugin.arraiz": "" });
        const plugins = cast<SyslTransformPluginClient[]>(
          await PluginLocator.builtinDiagramRenderers(sysl, "root")
        );

        expect(plugins.map((p) => p.scriptPath)).to.deep.equal([
          "root/extension/plugins/integration/integration_model_plugin.arraiz",
        ]);
      });

      test("single with siblings", async () => {
        mock({
          "root/extension/plugins/integration": {
            "integration_model_plugin.arraiz": "",
            "integration_model_plugin.arrai": "",
          },
        });
        const plugins = cast<SyslTransformPluginClient[]>(
          await PluginLocator.builtinDiagramRenderers(sysl, "root")
        );

        expect(plugins.map((p) => p.scriptPath)).to.deep.equal([
          "root/extension/plugins/integration/integration_model_plugin.arraiz",
        ]);
      });
    });

    suite("local", async () => {
      test("none", async () => {
        mock({ "workspace/foo.arraiz": "" });
        const plugins = await PluginLocator.localPlugins(sysl, ["workspace"]);

        expect(plugins).to.have.length(0);
      });

      test("single", async () => {
        mock({ "workspace/.sysl/plugins/foo.arraiz": "" });
        const plugins = cast<CommandPluginClient[]>(
          await PluginLocator.localPlugins(sysl, ["workspace"])
        );

        expect(plugins.map((p) => p.serverOptions.run.command)).to.deep.equal([
          "workspace/.sysl/plugins/foo.arraiz",
        ]);
      });

      test("multiple", async () => {
        mock({
          "workspace/.sysl/plugins/foo.arraiz": "",
          "workspace/.sysl/plugins/bar.arraiz": "",
          "workspace/.sysl/plugins/baz.arraiz": "",
        });
        const plugins = cast<CommandPluginClient[]>(
          await PluginLocator.localPlugins(sysl, ["workspace"])
        );

        expect(plugins.map((p) => p.serverOptions.run.command)).to.deep.equal([
          "workspace/.sysl/plugins/bar.arraiz",
          "workspace/.sysl/plugins/baz.arraiz",
          "workspace/.sysl/plugins/foo.arraiz",
        ]);
      });
    });
  });
});
