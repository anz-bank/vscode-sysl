import { workspace } from "vscode";
import { SyslConfiguration } from "./config";

/** Returns the Sysl extension's config from the workspace. */
export function getSyslConfig(): SyslConfiguration {
  return (workspace.getConfiguration("sysl") as SyslConfiguration) || {};
}
