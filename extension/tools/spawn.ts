import { Disposable } from "@anz-bank/vscode-sysl-model";
import { spawn, SpawnOptions } from "child_process";
import { pull, size } from "lodash";

/** Executes child processes and records completion. */
export class Executor {
  private readonly processes: { [key: string]: boolean } = {};

  private onSettledListeners: (() => any)[] = [];

  /**
   * Executes an asynchronous function and records its existence until it completes.
   */
  start(f: () => Promise<any>): Promise<any> {
    const id = this.id();
    this.processes[id] = true;
    const promise = f();
    promise.catch((e) => console.error(e)).finally(() => this.end(id));
    return promise;
  }

  /**
   * Handles the completion of a process. If it was the final active process, invokes all onComplete
   * listeners.
   */
  private end(id: string): void {
    delete this.processes[id];
    if (!this.count) {
      const listeners = this.onSettledListeners;
      this.onSettledListeners = [];
      listeners.forEach((f) => f());
    }
  }

  /**
   * Subscribes a callback to be invoked when all active processes have finished.
   *
   * If there are no active processes, the callback is invoked immediately.
   */
  public onSettled(listener: () => any): Disposable {
    if (!this.count) {
      listener();
      return { dispose: () => {} };
    }

    this.onSettledListeners.push(listener);
    return { dispose: () => pull(this.onSettledListeners, listener) };
  }

  /** Returns a promise that resolves once all active processes have finished. */
  public allSettled(): Promise<void> {
    return new Promise((resolve) => this.onSettled(resolve));
  }

  /** Returns the number of active processes. */
  get count(): number {
    return size(this.processes);
  }

  /** Returns a unique ID for a new process. */
  private id(): string {
    let id = new Date().getTime();
    if (id.toString() in this.processes) {
      id++;
    }
    return id.toString();
  }
}

/** Maintains a record of all active child process executions. */
const executor = new Executor();

/** Spawns a child process and returns a promise that resolves to the buffer content of stdout. */
export function spawnBuffer(
  command: string,
  args: ReadonlyArray<string> = [],
  options: SpawnOptions & { input?: any } = {}
): Promise<Buffer> {
  return executor.start(
    () =>
      new Promise<Buffer>((resolve, reject) => {
        console.debug(`spawn: ${command} ${args.join(" ")} ${options.input ? "<stdin>" : ""}`);
        const process = spawn(command, args, options);
        if (options.input) {
          options.input && process.stdin?.write(options.input);
        }
        process.stdin?.end();

        let chunks: any[] = [];
        let result: Buffer;
        process.stdout?.on("data", (data: Buffer) => chunks.push(data));
        process.stdout?.on("end", () => (result = Buffer.concat(chunks)));
        process.stderr?.on("data", (data) => console.error(`spawn stderr: ${data}`));
        process.on("error", (err) => reject(`spawn error: ${err}`));
        process.on("close", (code) => {
          code === 0 ? resolve(result) : reject(`spawn exited with code ${code}`);
        });
      })
  );
}

// Hack to expose the spawned process counters to the test framework.
// Static variables aren't available in CI for some reason.
(global as any).__executor__ = executor;
