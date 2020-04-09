/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { window, commands } from 'vscode';

import {
	LanguageClient,
	// eslint-disable-next-line no-unused-vars
	LanguageClientOptions,
	RevealOutputChannelOn,
	// eslint-disable-next-line no-unused-vars
	ServerOptions,
} from 'vscode-languageclient';

import { getBinPath, getToolsEnvVars } from './utils';
import { installSyslLsp } from './installSyslLsp';
import { outputChannel } from './goStatus';

let client: LanguageClient;

interface LanguageServerConfig {
	flags: string[];
}


export function activate() {
	/*
	// The server is implemented in node
	let serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};
	*/

	const languageServerToolPath = getLanguageServerToolPath();
	const config = parseLanguageServerConfig();
	const env = getToolsEnvVars();

	console.log(languageServerToolPath);
	console.log(config);
	console.log(env);

	// If the extension is launched in debug mode then the debg server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		debug: {
			command: languageServerToolPath,
			args: [],
			//args: ['-mode=stdio', ...config.flags],
			options: { env }
		},
		run: {
			command: languageServerToolPath,
			args: [],
			//args: ['-mode=stdio', ...config.flags],
			options: { env }
		},
	};

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'sysl' }],
		revealOutputChannelOn: RevealOutputChannelOn.Never,
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		"SYSL",
		"SYSL Language Server",
		serverOptions,
		clientOptions
	);
	commands.registerCommand("sysl.tools.installSyslLsp", installSyslLsp)

	// Start the client. This will also launch the server
	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}

export function getLanguageServerToolPath(): string {
	// Get the path to gopls or any alternative that the user might have set for gopls.
	const goplsBinaryPath = getBinPath('sysllsp');
	outputChannel.append(goplsBinaryPath);
	if (!path.isAbsolute(goplsBinaryPath)) {
		showMissingSyslLSPBox()
	}
	return goplsBinaryPath;
}

export function showMissingSyslLSPBox() {
	window.showInformationMessage(
		"You need to install Sysl LSP to use the language server, would you like to install it?",
		"Yes", "No"
	).then((value: string) => {
		if (value == "Yes") {
			commands.executeCommand("sysl.tools.installSyslLsp")
		}
	})
}

export function parseLanguageServerConfig(): LanguageServerConfig {
	const config = {
		flags: []
	};

	return config;
}
