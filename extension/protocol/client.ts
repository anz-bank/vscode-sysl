import { spawnSync, SpawnSyncOptionsWithBufferEncoding } from "child_process";
import { Request, OnChangeRequest, Response } from "./plugin";
import { merge } from "lodash";

/** Details about how to invoke the plugin. */
export type ServerOptions = {
  run: {
    command: string;
    args?: string[];
  };
};

/** Trivial interface for logging messages about requests and responses. */
export interface Logger {
  log(id: string, kind: string, ...message: string[]);
}

const defaultLogger: Logger = {
  log: (id: string, kind: string, ...message: string[]) => console.log(id, kind, ...message),
};

/** Details about the client's environment. */
export type PluginClientOptions = {
  workspaceFolder?: string;
  debug?: boolean;
  logger?: Logger;
};

/** Represents a change in the workspace that a plugin may be interested in. */
export type ChangeEvent = {
  file: string;
};

export interface PluginClient<T = Response> {
  start(): Promise<T>;
  stop(): Promise<T>;
  onChange(change: OnChangeRequest): Promise<T>;
}

/** Connects to and communicates with a plugin. */
export class CommandPluginClient implements PluginClient {
  private debug: boolean;
  private logger: Logger;

  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly _serverOptions: ServerOptions,
    private readonly _clientOptions: PluginClientOptions = {}
  ) {
    this.debug = _clientOptions.debug ?? true;
    this.logger = _clientOptions.logger ?? defaultLogger;
  }

  /**
   * Initializes the plugin client for communication with the plugin.
   */
  async start(): Promise<Response> {
    return this.initialize();
  }

  /**
   * Shuts down the plugin client, disconnecting from the plugin.
   */
  async stop(): Promise<Response> {
    return this.shutdown();
  }

  /**
   * Sends the plugin an {@link InitializeRequest} with details of the client.
   */
  private async initialize(): Promise<Response> {
    return this.callPlugin({ initialize: {} });
  }

  /**
   * Requests the plugin to shutdown and clean up any resources.
   */
  private async shutdown(): Promise<Response> {
    return {};
  }

  /**
   * Sends the plugin an {@link OnChangeRequest} with details of what has changed.
   */
  async onChange(change: OnChangeRequest): Promise<Response> {
    return this.callPlugin({ onchange: change });
  }

  /**
   * Sends a request to the plugin, and return the response when it arrives.
   */
  private async callPlugin(request: Request): Promise<Response> {
    const id = new Date().toISOString().replace(/:/g, "-");
    if (this.debug) {
      let logRequest = request;
      const module = request.onchange?.context?.module;
      if (module) {
        const clearModule: Request = {
          onchange: { context: { module: `${module.length} bytes` } },
        };
        logRequest = merge({}, request, clearModule);
      }
      this.logger.log(id, "request", JSON.stringify(logRequest, null, 2));
    }

    const run = this._serverOptions.run;
    const response = await this.spawn(run.command, run.args || [], {
      input: JSON.stringify(request),
    });
    const out = JSON.parse(response.toString());
    if (this.debug) {
      this.logger.log(id, "response", JSON.stringify(out, null, 2));
    }
    return out;
  }

  /**
   * Spawns a subprocess and returns the stdout buffer.
   */
  private async spawn(
    command: string,
    args?: ReadonlyArray<string>,
    options?: SpawnSyncOptionsWithBufferEncoding
  ): Promise<Buffer> {
    const child = spawnSync(command, args, options);
    if (child.stderr.length) {
      console.debug(child.stderr.toString());
    }
    return child.stdout;
  }

  public get clientOptions(): PluginClientOptions {
    return this._clientOptions;
  }

  public get serverOptions(): ServerOptions {
    return this._serverOptions;
  }
}
