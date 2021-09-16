import { filter, map } from "lodash";
import { PluginClient } from "../protocol/client";
import { OnChangeRequest, OnChangeResponse, Response } from "../protocol/plugin";

function isFulfilled<T>(p: PromiseSettledResult<any>): boolean {
  return p.status === "fulfilled";
}

async function allFulfilled<T>(promises: Promise<T>[]): Promise<T[]> {
  return map((await Promise.allSettled(promises)).filter(isFulfilled), "value");
}

async function allSuccessful(promises: Promise<Response>[]): Promise<Response[]> {
  return filter(await allFulfilled(promises), (r) => !r.error);
}

/** Manages the location, fetching and invocation of plugins. */
export class PluginManager implements PluginClient<any[]> {
  private plugins: PluginClient[];

  constructor(plugins: PluginClient[] = []) {
    this.plugins = plugins;
  }

  async start(): Promise<any[]> {
    return allSuccessful(this.plugins.map((p) => p.start()));
  }

  async stop(): Promise<any[]> {
    return allSuccessful(this.plugins.map((p) => p.stop()));
  }

  async onChange(change: OnChangeRequest): Promise<OnChangeResponse[]> {
    const calls = this.plugins.map((p) => p.onChange(change));
    return filter(await allSuccessful(calls)).map((r) => r.onchange!);
  }
}
