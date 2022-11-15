import { Model } from "@anz-bank/sysl/model";
import { PbDocumentModel } from "@anz-bank/sysl/pbModel";
import { SpawnOptions } from "child_process";
import { filter, map } from "lodash";
import memoize from "memoizee";
import path, { normalize } from "path";
import { coerce, SemVer } from "semver";
import { output } from "../constants";
import { spawnBuffer } from "./spawn";

/** The possible Sysl protobuf representations. */
export type ProtobufMode = "json" | "pb" | "textpb";

export type ImportOptions = {
  "app-name"?: string;
  output?: string;
  package?: string;
  format?: string;
  "import-paths"?: string[];
};

/** A wrapper around a Sysl executable to perform operations on sources. */
export class Sysl {
  /** The path to the Sysl executable to use. */
  public readonly path: string;

  /** Memoized {@link spawnBuffer}. */
  private readonly memoSpawn: typeof spawnBuffer;

  constructor(path: string) {
    this.path = path;
    this.memoSpawn = memoize(memoSpawn, { normalizer: JSON.stringify });
  }

  /**
   * Returns true if Sysl debugging is enabled.
   *
   * Sysl debug is enabled if the {@code SYSL_DEBUG} env var is anything other than "" or "off".
   */
  public static isDebugEnabled(): boolean {
    return process.env.SYSL_DEBUG !== "off" || false;
  }

  /** Returns a protobuf message representing the compiled content of source. */
  public async protobufModuleFromSource(source: string, sourcePath: string): Promise<any> {
    const buffer = await this.protobufFromSource(source, sourcePath, "json");
    return JSON.parse(buffer.toString("utf-8"));
  }

  /** Returns a protobuf message representing the compiled content of source. */
  public async modelFromSource(source: string, sourcePath: string): Promise<Model> {
    const buffer = await this.protobufFromSource(source, sourcePath, "json");
    return PbDocumentModel.fromJson(buffer.toString("utf-8"))!.toModel();
  }

  /** Returns a protobuf message representing the compiled content of the spec at modelPath. */
  public async protobuf(modelPath: string, mode: ProtobufMode = "json"): Promise<Buffer> {
    const args = ["protobuf", `--mode=${mode}`, path.basename(modelPath)];
    // Execute sysl in the model's directory.
    const cwd = path.join(modelPath, "..");
    return this.memoSpawn(this.path, args, { cwd });
  }

  /** Returns a protobuf message representing the compiled content of source. */
  public async protobufFromSource(
    source: string,
    sourcePath: string,
    mode: ProtobufMode = "json"
  ): Promise<Buffer> {
    const input = this.toStdin(sourcePath, source);
    return this.memoSpawn(this.path, ["protobuf", `--mode=${mode}`], { input });
  }

  /** Returns the output of sysl transform on a model using a script. */
  public async transformSource(
    modelPath: string,
    scriptPath: string,
    syslSource: string
  ): Promise<string> {
    return (await this.transformSourceBuffer(modelPath, scriptPath, syslSource)).toString("utf-8");
  }

  /** Returns the output of sysl transform on a model using a script. */
  public async transformSourceBuffer(
    modelPath: string,
    scriptPath: string,
    syslSource: string
  ): Promise<Buffer> {
    const options = {
      input: this.toStdin(modelPath, syslSource),
      timeout: 50000,
    };
    return this.memoSpawn(this.path, ["transform", `--script=${scriptPath}`], options);
  }

  /** Imports the {@code input} file to a Sysl spec. */
  public async import(input: string, options: ImportOptions = {}): Promise<string> {
    options["app-name"] ??= "App";
    const args = Object.entries(options)
      .filter(([k, v]) => v != undefined)
      .map(([k, v]) => `--${k}=${v}`);
    const output = await spawnBuffer(this.path, ["import", `--input=${input}`, ...args]);
    return options["output"] ?? output.toString();
  }

  /** Returns the version of Sysl, or undefined if the version cannot be determined. */
  public async version(): Promise<string | undefined> {
    const info = (await this.memoSpawn(this.path, ["info"])).toString("utf-8");
    return info.match(/Version\s*:\s*[^v]*(v[^\r\n]+)/)?.[1];
  }

  /** Returns the semantic version of Sysl extracted from the version code in info output. */
  public async semver(): Promise<SemVer | null | undefined> {
    const version = await this.version();
    return coerce(version);
  }

  /** Returns the string to pass to stdin for Sysl to process the content at path. */
  private toStdin(path: string, content: string): string {
    return JSON.stringify([{ path, content }]);
  }
}

/** Delegates to {@link spawnBuffer} and memoizes results for identical calls. */
async function memoSpawn(
  command: string,
  args: ReadonlyArray<string> = [],
  options: SpawnOptions & { input?: any } = {}
): Promise<Buffer> {
  return spawnBuffer(command, args, options);
}
