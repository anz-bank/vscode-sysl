import path from "path";
import { Sysl } from "../../../tools/sysl";
import { CommandPluginClient } from "../../command_client";
import { Events } from "../../types";

const rootPath = path.join(__dirname, "..", "..", "..", "..");
const pluginPath = path.join(
  rootPath,
  "out",
  "plugins",
  "examples",
  "spp-typescript",
  "example_plugin.js"
);
// The path for this script if using command ts-node is:
// const pluginPath = path.join(__dirname, "example_plugin.ts");

export class ExampleClient extends CommandPluginClient {
  constructor(sysl: Sysl, events: Events) {
    super("example", sysl, { command: "node", args: [pluginPath] }, events);
  }
}
