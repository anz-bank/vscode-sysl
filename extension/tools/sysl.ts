import { Model } from "@anz-bank/sysl/model";
import { PbDocumentModel } from "@anz-bank/sysl/pbModel";
import { truncate } from "lodash";
import memoize from "memoizee";
import path from "path";
import { coerce, SemVer } from "semver";
import { defaultLogger, Logger } from "./logging";
import { spawnBuffer } from "./spawn";

/** The possible Sysl protobuf representations. */
export type ProtobufMode = "json" | "pb" | "textpb";

/** A wrapper around a Sysl executable to perform operations on sources. */
export class Sysl {
  /** The path to the Sysl executable to use. */
  public readonly path: string;

  private readonly logger: Logger;

  constructor(path: string, options?: { logger?: Logger }) {
    this.path = path;
    this.logger = options?.logger ?? defaultLogger;
    this.protobufFromSource = memoize(this.protobufFromSource.bind(this), {});
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
    return spawnBuffer(this.path, args);
  }

  /** Returns a protobuf message representing the compiled content of source. */
  public async protobufFromSource(
    source: string,
    sourcePath: string,
    mode: ProtobufMode = "json"
  ): Promise<Buffer> {
    const args = ["protobuf", `--mode=${mode}`];
    const input = this.toStdin(sourcePath, source);

    const optionsStr = { input: truncate(input.toString()) };
    this.logger.log("protobuf spawn:", this.path, ...(args ?? []), optionsStr);

    const result = await spawnBuffer(this.path, args, { input });

    this.logger.log("protobuf complete:", this.path, ...(args ?? []), truncate(result.toString()));

    return result;
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
    const args = ["transform", `--script=${scriptPath}`];

    const optionsStr = { ...options, input: truncate(options.input.toString()) };
    this.logger.log("transform spawn:", this.path, ...(args ?? []), optionsStr);

    const result = await spawnBuffer(this.path, args, options);

    this.logger.log("transform complete:", this.path, ...(args ?? []), truncate(result.toString()));

    return result;
  }

  /** Returns the version of Sysl, or undefined if the version cannot be determined. */
  public async version(): Promise<string | undefined> {
    const info = (await spawnBuffer(this.path, ["info"])).toString("utf-8");
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
