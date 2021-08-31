/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
// FORKED ON: 2019/03/11

import fs = require("fs");
import os = require("os");
import path = require("path");
import vscode = require("vscode");
import {
  fixDriveCasingInWindows,
  getBinPathWithPreferredGopath,
  getInferredGopath,
  resolveHomeDir,
} from "./goPath";

let toolsGopath: string | undefined;
let currentGopath: string | undefined;

export function getGoConfig(uri?: vscode.Uri): vscode.WorkspaceConfiguration {
  if (!uri) {
    if (vscode.window.activeTextEditor) {
      uri = vscode.window.activeTextEditor.document.uri;
    } else {
      uri = undefined;
    }
  }
  return vscode.workspace.getConfiguration("go", uri);
}

export function getToolsGopath(useCache: boolean = true): string | undefined {
  if (!useCache || !toolsGopath) {
    toolsGopath = resolveToolsGopath();
  }
  return toolsGopath;
}

function resolveToolsGopath(): string | undefined {
  let toolsGopathForWorkspace = substituteEnv(getGoConfig()["toolsGopath"] || "");

  // In case of single root
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length <= 1) {
    return resolvePath(toolsGopathForWorkspace);
  }

  // In case of multi-root, resolve ~ and ${workspaceFolder}
  if (toolsGopathForWorkspace.startsWith("~")) {
    toolsGopathForWorkspace = path.join(os.homedir(), toolsGopathForWorkspace.substr(1));
  }
  if (
    toolsGopathForWorkspace &&
    toolsGopathForWorkspace.trim() &&
    !/\${workspaceFolder}|\${workspaceRoot}/.test(toolsGopathForWorkspace)
  ) {
    return toolsGopathForWorkspace;
  }

  // If any of the folders in multi root have toolsGopath set, use it.
  for (const folder of vscode.workspace.workspaceFolders) {
    let toolsGopathFromConfig = <string>(
      getGoConfig(folder.uri).inspect("toolsGopath")?.workspaceFolderValue
    );
    toolsGopathFromConfig = resolvePath(toolsGopathFromConfig, folder.uri.fsPath);
    if (toolsGopathFromConfig) {
      return toolsGopathFromConfig;
    }
  }
  return;
}

export function getBinPath(tool: string): string | undefined {
  const alternateTools = getGoConfig().get<{ [key: string]: string }>("alternateTools");
  if (!alternateTools) {
    return undefined;
  }
  const alternateToolPath: string = alternateTools[tool];

  const preferredGoPaths = tool === "go" ? [] : [getToolsGopath(), getCurrentGoPath()];
  return getBinPathWithPreferredGopath(tool, preferredGoPaths, resolvePath(alternateToolPath));
}

export function getToolsEnvVars(): any {
  const config = getGoConfig();
  const toolsEnvVars = config["toolsEnvVars"];

  const gopath = getCurrentGoPath();
  const envVars = Object.assign({}, process.env, gopath ? { GOPATH: gopath } : {});

  if (toolsEnvVars && typeof toolsEnvVars === "object") {
    Object.keys(toolsEnvVars).forEach(
      (key) =>
        (envVars[key] =
          typeof toolsEnvVars[key] === "string"
            ? resolvePath(toolsEnvVars[key])
            : toolsEnvVars[key])
    );
  }

  return envVars;
}

export function substituteEnv(input: string): string {
  return input.replace(/\${env:([^}]+)}/g, (match, capture) => {
    return process.env[capture.trim()] || "";
  });
}

export function getCurrentGoPath(workspaceUri?: vscode.Uri): string | undefined {
  const activeEditorUri =
    vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri;
  const currentFilePath = activeEditorUri && fixDriveCasingInWindows(activeEditorUri.fsPath);
  const currentRoot =
    (workspaceUri && workspaceUri.fsPath) || getWorkspaceFolderPath(activeEditorUri) || "";
  const config = getGoConfig(workspaceUri || activeEditorUri);

  // Infer the GOPATH from the current root or the path of the file opened in current editor
  // Last resort: Check for the common case where GOPATH itself is opened directly in VS Code
  let inferredGopath: string | undefined;
  if (config["inferGopath"] === true) {
    inferredGopath = getInferredGopath(currentRoot) || getInferredGopath(currentFilePath);
    if (!inferredGopath) {
      try {
        if (fs.statSync(path.join(currentRoot, "src")).isDirectory()) {
          inferredGopath = currentRoot;
        }
      } catch (e) {
        // No op
      }
    }
    if (inferredGopath && process.env["GOPATH"] && inferredGopath !== process.env["GOPATH"]) {
      inferredGopath += path.delimiter + process.env["GOPATH"];
    }
  }

  const configGopath = config["gopath"]
    ? resolvePath(substituteEnv(config["gopath"]), currentRoot)
    : "";
  currentGopath = inferredGopath ? inferredGopath : configGopath || process.env["GOPATH"];
  return currentGopath;
}

/**
 * Expands ~ to homedir in non-Windows platform and resolves ${workspaceFolder} or ${workspaceRoot}
 */
export function resolvePath(inputPath: string, workspaceFolder?: string): string {
  if (!inputPath || !inputPath.trim()) {
    return inputPath;
  }

  if (!workspaceFolder && vscode.workspace.workspaceFolders) {
    workspaceFolder = getWorkspaceFolderPath(
      vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri
    );
  }

  if (workspaceFolder) {
    inputPath = inputPath.replace(/\${workspaceFolder}|\${workspaceRoot}/g, workspaceFolder);
  }
  return resolveHomeDir(inputPath);
}

export function getWorkspaceFolderPath(fileUri?: vscode.Uri): string | undefined {
  if (fileUri) {
    const workspace = vscode.workspace.getWorkspaceFolder(fileUri);
    if (workspace) {
      return fixDriveCasingInWindows(workspace.uri.fsPath);
    }
  }

  // fall back to the first workspace
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length) {
    return fixDriveCasingInWindows(folders[0].uri.fsPath);
  }
}

/**
 * Returns file path for given name in temp dir
 * @param name Name of the file
 */
export function getTempFilePath(name: string): string {
  const tmpDir = fs.mkdtempSync(os.tmpdir() + path.sep + "vscode-go");

  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
  }

  return path.normalize(path.join(tmpDir, name));
}
