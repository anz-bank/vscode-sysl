'use strict'
import cp = require('child_process');
import fs = require('fs');
import path = require('path');
import vscode = require('vscode');
import { outputChannel } from './goStatus';
import { envPath } from './goPath';

import { getBinPath, getGoConfig, getTempFilePath} from './utils';

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
	const editor = vscode.window.activeTextEditor;
	const cwd = path.dirname(editor.document.uri.fsPath);

	const goConfig = getGoConfig();
	const buildFlags = goConfig['buildFlags'] || [];
	const args = ['install', 'github.com/anz-bank/sysl/cmd/sysllsp', ...buildFlags];

	if (goConfig['buildTags'] && buildFlags.indexOf('-tags') === -1) {
		args.push('-tags', goConfig['buildTags']);
	}

	outputChannel.clear();
	outputChannel.show();

	// Install tools in a temporary directory, to avoid altering go.mod files.
	const toolsTmpDir = fs.mkdtempSync(getTempFilePath('go-tools-'));
	const getOpts = {
		cwd: toolsTmpDir,
		env: env
	}
	const getArgs = ["get", "-v", "-u", "github.com/anz-bank/sysl/cmd/sysl"];
	//TODO: need to do install directly to the language server
	cp.execFile(goRuntimePath, getArgs, getOpts, (err, stdout, stderr) => {
			outputChannel.appendLine(`running ` + goRuntimePath + ` `+ getArgs.join(" "));
			if (err) {
				outputChannel.appendLine(`Installation failed: ${stderr}`);
			}
		}
	)
	cp.execFile(goRuntimePath, args, { env, cwd }, (err, stdout, stderr) => {
		outputChannel.appendLine(err ? `Installation failed: ${stderr}` : `Installation successful`);
	});
}