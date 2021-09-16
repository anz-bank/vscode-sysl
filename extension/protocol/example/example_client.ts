import { CommandPluginClient, PluginClientOptions, ServerOptions } from "../client";

export class ExampleClient extends CommandPluginClient {
  constructor(
    id: string,
    name: string,
    serverOptions: ServerOptions,
    clientOptions: PluginClientOptions = {}
  ) {
    super(id, name, serverOptions, clientOptions);
  }
}
