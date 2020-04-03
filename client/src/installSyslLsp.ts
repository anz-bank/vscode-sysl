'use strict'
import cp = require('child_process');
import fs = require('fs');
import vscode = require('vscode');
import { outputChannel } from './goStatus';
import { envPath } from './goPath';

import { getBinPath, getGoConfig, getTempFilePath } from './utils';

export async function installSyslLsp() {
	const goRuntimePath = getBinPath('go');
	if (!goRuntimePath) {
		vscode.window.showErrorMessage(
			`Failed to run "go get" to install the packages as the "go" binary cannot be found in either GOROOT(${process.env['GOROOT']}) or PATH(${envPath})`
		);
		return;
	}

	outputChannel.show();
	outputChannel.clear();


	if (!goRuntimePath) {
		vscode.window.showErrorMessage(
			`Failed to run "go install" to install the package as the "go" binary cannot be found in either GOROOT(${process.env['GOROOT']}) or PATH(${envPath})`
		);
		return;
	}

	// http.proxy setting takes precedence over environment variables
	const httpProxy = vscode.workspace.getConfiguration('http', null).get('proxy');
	let env = Object.assign({}, process.env);
	if (httpProxy) {
		env = Object.assign({}, process.env, {
			http_proxy: httpProxy,
			HTTP_PROXY: httpProxy,
			https_proxy: httpProxy,
			HTTPS_PROXY: httpProxy
		});
	}

	const goConfig = getGoConfig();
	const buildFlags = goConfig['buildFlags'] || [];

	outputChannel.clear();
	outputChannel.show();

	// Install tools in a temporary directory, to avoid altering go.mod files.
	const toolsTmpDir = fs.mkdtempSync(getTempFilePath('go-tools-'));
	const opts = {
		cwd: toolsTmpDir,
		env: env
	}

	const getArgs = ["get", "-u", "-d", "-v", "github.com/anz-bank/sysl/cmd/sysllsp"];
	outputChannel.appendLine(`running ` + goRuntimePath + ` ` + getArgs.join(" "));
	cp.execFile(goRuntimePath, getArgs, opts, (err, stdout, stderr) => {
		if (err) {
			outputChannel.appendLine(`Installation failed: ${stderr}`);
		} else {
			const args = ['install', 'github.com/anz-bank/sysl/cmd/sysllsp', ...buildFlags];
			if (goConfig['buildTags'] && buildFlags.indexOf('-tags') === -1) {
				args.push('-tags', goConfig['buildTags']);
			}

			cp.execFile(goRuntimePath, args, opts, (err, stdout, stderr) => {
				outputChannel.appendLine(err ? `Installation failed: ${stderr}` : `Installation successful`);
				if (!err) {
					outputChannel.appendLine("Please reload the VS Code window to use the language server.")
				}
			});
		}
	})

}
