"use strict";
import { execFile } from "child_process";
import { mkdtempSync } from "fs";
import { isAbsolute } from "path";
import { commands, window, workspace } from "vscode";
import {
    LanguageClient,
    LanguageClientOptions,
    RevealOutputChannelOn,
    ServerOptions,
} from "vscode-languageclient/node";

import { installSyslLspCommand } from "../constants";
import { outputChannel } from "./goStatus";
import { envPath } from "./goPath";
import { getToolsEnvVars, getBinPath, getGoConfig, getTempFilePath } from "./utils";

/** Creates and returns a language client to connect to the language server. */
export function buildClient(): LanguageClient {
    const languageServerToolPath = getSyslLspToolPath() ?? "";
    const env = getToolsEnvVars();

    console.log(languageServerToolPath);
    console.log(env);

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used.
    const serverOptions: ServerOptions = {
        debug: {
            command: languageServerToolPath,
            args: [],
            options: { env },
        },
        run: {
            command: languageServerToolPath,
            args: [],
            options: { env },
        },
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: "file", language: "sysl" }],
        revealOutputChannelOn: RevealOutputChannelOn.Never,
    };

    return new LanguageClient("Sysl", "Sysl Language Server", serverOptions, clientOptions);
}

export function getSyslLspToolPath(): string | undefined {
    // Get the path to gopls or any alternative that the user might have set for gopls.
    const goplsBinaryPath: string | undefined = getBinPath("sysllsp");
    outputChannel.append(goplsBinaryPath ?? "<undefined>");
    if (goplsBinaryPath) {
        if (!isAbsolute(goplsBinaryPath)) {
            showMissingSyslLspBox();
        }
    }
    return goplsBinaryPath;
}

export async function showMissingSyslLspBox(): Promise<void> {
    const msg =
        "You need to install Sysl LSP to use the Sysl language server. Would you like to install it?";
    if ((await window.showInformationMessage(msg, "Yes", "No")) === "Yes") {
        commands.executeCommand(installSyslLspCommand);
    }
}

export async function installSyslLsp(): Promise<void> {
    const goRuntimePath = getBinPath("go");
    if (!goRuntimePath) {
        window.showErrorMessage(
            `Failed to run "go get" to install the packages as the "go" binary cannot be found in ` +
                `either GOROOT (${process.env["GOROOT"]}) or PATH (${envPath})`
        );
        return;
    }

    outputChannel.show();
    outputChannel.clear();

    // http.proxy setting takes precedence over environment variables
    const httpProxy = workspace.getConfiguration("http", null).get("proxy");
    let env = Object.assign({}, process.env);
    if (httpProxy) {
        env = Object.assign({}, process.env, {
            http_proxy: httpProxy,
            HTTP_PROXY: httpProxy,
            https_proxy: httpProxy,
            HTTPS_PROXY: httpProxy,
        });
    }

    const goConfig = getGoConfig();
    const buildFlags = goConfig["buildFlags"] || [];

    outputChannel.clear();
    outputChannel.show();

    // Install tools in a temporary directory, to avoid altering go.mod files.
    const toolsTmpDir = mkdtempSync(getTempFilePath("go-tools-"));
    const opts = {
        cwd: toolsTmpDir,
        env: env,
    };

    const getArgs = ["get", "-u", "-d", "-v", "github.com/anz-bank/sysl/cmd/sysllsp"];
    outputChannel.appendLine(`running ${goRuntimePath} ${getArgs.join(" ")}`);
    execFile(goRuntimePath, getArgs, opts, (err, stdout, stderr) => {
        if (err) {
            outputChannel.appendLine(`Installation failed: ${stderr}`);
        } else {
            const args = ["install", "github.com/anz-bank/sysl/cmd/sysllsp", ...buildFlags];
            if (goConfig["buildTags"] && buildFlags.indexOf("-tags") === -1) {
                args.push("-tags", goConfig["buildTags"]);
            }

            execFile(goRuntimePath, args, opts, (err, stdout, stderr) => {
                outputChannel.appendLine(
                    err ? `Installation failed: ${stderr}` : `Installation successful`
                );
                if (!err) {
                    outputChannel.appendLine(
                        "Please reload the VS Code window to use the language server."
                    );
                }
            });
        }
    });
}
