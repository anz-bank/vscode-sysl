import {
  execSync,
  ExecSyncOptionsWithBufferEncoding,
  spawnSync,
  SpawnSyncOptionsWithBufferEncoding,
} from "child_process";
import path from "path";
import { truncate } from "lodash";

/** A wrapper around a Sysl executable to perform operations on sources. */
export class Sysl {
  /** The path to the Sysl executable to use. */
  public readonly path: string;

  constructor(path: string) {
    this.path = path.replace(/ /g, `\\ `);
  }

  /** Returns a protobuf message representing the compiled content of doc. */
  public async protobufForDoc(source: string): Promise<any> {
    const result = this.spawnSync(this.path, ["protobuf", "--mode=json"], { input: source });
    return JSON.parse(result);
  }

  /** Returns a protobuf message representing the compiled content of the spec at modelPath. */
  public async protobuf(modelPath: string): Promise<any> {
    const cwd = path.dirname(modelPath);
    const command = `${this.path} protobuf --mode=json ${path.basename(modelPath)}`;
    return JSON.parse(this.execSync(command, { cwd }));
  }

  /** Returns the output of sysl transform on a model using a script. */
  public async transform(modelPath: string, scriptPath: string): Promise<string> {
    const opts = { cwd: path.dirname(modelPath), timeout: 50000 };
    const cmd = `${this.path} transform ${path.basename(modelPath)} --script=${scriptPath}`;
    return this.execSync(cmd, opts);
  }

  private execSync(cmd: string, opts: ExecSyncOptionsWithBufferEncoding): string {
    console.debug("sysl exec:", cmd, opts);
    return execSync(cmd, opts).toString("utf8");
  }

  private spawnSync(
    command: string,
    args?: ReadonlyArray<string>,
    options?: SpawnSyncOptionsWithBufferEncoding
  ): string {
    const optionsStr = { ...options, input: truncate(options?.input) };
    console.debug("sysl spawn:", command, optionsStr);
    return spawnSync(command, args, options).stdout.toString("utf-8");
  }
}
