import path from "path";
import { CommandPluginClient, PluginClientOptions } from "../client";

const pluginPath = path.join(__dirname, "example_plugin.js");

export class ExampleClient extends CommandPluginClient {
  constructor(clientOptions: PluginClientOptions = {}) {
    super("example", "Example", { run: { command: "node", args: [pluginPath] } }, clientOptions);
  }
}
