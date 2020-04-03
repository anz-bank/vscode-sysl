/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
// FORKED ON: 2019/03/11

import cp = require('child_process');
import fs = require('fs');
import os = require('os');
import path = require('path');
import semver = require('semver');
import vscode = require('vscode');
import {
	envPath,
	fixDriveCasingInWindows,
	getBinPathWithPreferredGopath,
	getInferredGopath,
	resolveHomeDir
} from './goPath';

let userNameHash: number = 0;

export const goKeywords: string[] = [
	'break',
	'case',
	'chan',
	'const',
	'continue',
	'default',
	'defer',
	'else',
	'fallthrough',
	'for',
	'func',
	'go',
	'goto',
	'if',
	'import',
	'interface',
	'map',
	'package',
	'range',
	'return',
	'select',
	'struct',
	'switch',
	'type',
	'var'
];

export const goBuiltinTypes: Set<string> = new Set<string>([
	'bool',
	'byte',
	'complex128',
	'complex64',
	'error',
	'float32',
	'float64',
	'int',
	'int16',
	'int32',
	'int64',
	'int8',
	'rune',
	'string',
	'uint',
	'uint16',
	'uint32',
	'uint64',
	'uint8',
	'uintptr'
]);

export class GoVersion {
	public sv: semver.SemVer;
	public isDevel: boolean;
	private commit: string;

	constructor(version: string) {
		const matchesRelease = /go version go(\d.\d+).*/.exec(version);
		const matchesDevel = /go version devel \+(.[a-zA-Z0-9]+).*/.exec(version);
		if (matchesRelease) {
			this.sv = semver.coerce(matchesRelease[0]);
		} else if (matchesDevel) {
			this.isDevel = true;
			this.commit = matchesDevel[0];
		}
	}

	public format(): string {
		if (this.sv) {
			return this.sv.format();
		}
		return `devel +${this.commit}`;
	}

	public lt(version: string): boolean {
		// Assume a developer version is always above any released version.
		// This is not necessarily true.
		if (this.isDevel || !this.sv) {
			return false;
		}
		return semver.lt(this.sv, semver.coerce(version));
	}

	public gt(version: string): boolean {
		// Assume a developer version is always above any released version.
		// This is not necessarily true.
		if (this.isDevel || !this.sv) {
			return true;
		}
		return semver.gt(this.sv, semver.coerce(version));
	}
}

let cachedGoVersion: GoVersion = null;
let vendorSupport: boolean = null;
let toolsGopath: string;

export function getGoConfig(uri?: vscode.Uri): vscode.WorkspaceConfiguration {
	if (!uri) {
		if (vscode.window.activeTextEditor) {
			uri = vscode.window.activeTextEditor.document.uri;
		} else {
			uri = null;
		}
	}
	return vscode.workspace.getConfiguration('go', uri);
}

export function byteOffsetAt(document: vscode.TextDocument, position: vscode.Position): number {
	const offset = document.offsetAt(position);
	const text = document.getText();
	return Buffer.byteLength(text.substr(0, offset));
}

export interface Prelude {
	imports: Array<{ kind: string; start: number; end: number; pkgs: string[] }>;
	pkg: { start: number; end: number; name: string };
}

export function parseFilePrelude(text: string): Prelude {
	const lines = text.split('\n');
	const ret: Prelude = { imports: [], pkg: null };
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const pkgMatch = line.match(/^(\s)*package(\s)+(\w+)/);
		if (pkgMatch) {
			ret.pkg = { start: i, end: i, name: pkgMatch[3] };
		}
		if (line.match(/^(\s)*import(\s)+\(/)) {
			ret.imports.push({ kind: 'multi', start: i, end: -1, pkgs: [] });
		}
		if (line.match(/^(\s)*import(\s)+[^\(]/)) {
			ret.imports.push({ kind: 'single', start: i, end: i, pkgs: [] });
		}
		if (line.match(/^(\s)*(\/\*.*\*\/)*\s*\)/)) {
			if (ret.imports[ret.imports.length - 1].end === -1) {
				ret.imports[ret.imports.length - 1].end = i;
			}
		} else if (ret.imports.length) {
			if (ret.imports[ret.imports.length - 1].end === -1) {
				const importPkgMatch = line.match(/"([^"]+)"/);
				if (importPkgMatch) {
					ret.imports[ret.imports.length - 1].pkgs.push(importPkgMatch[1]);
				}
			}
		}

		if (line.match(/^(\s)*(func|const|type|var)\s/)) {
			break;
		}
	}
	return ret;
}

// Takes a Go function signature like:
//     (foo, bar string, baz number) (string, string)
// and returns an array of parameter strings:
//     ["foo", "bar string", "baz string"]
// Takes care of balancing parens so to not get confused by signatures like:
//     (pattern string, handler func(ResponseWriter, *Request)) {
export function getParametersAndReturnType(signature: string): { params: string[]; returnType: string } {
	const params: string[] = [];
	let parenCount = 0;
	let lastStart = 1;
	for (let i = 1; i < signature.length; i++) {
		switch (signature[i]) {
			case '(':
				parenCount++;
				break;
			case ')':
				parenCount--;
				if (parenCount < 0) {
					if (i > lastStart) {
						params.push(signature.substring(lastStart, i));
					}
					return {
						params,
						returnType: i < signature.length - 1 ? signature.substr(i + 1) : ''
					};
				}
				break;
			case ',':
				if (parenCount === 0) {
					params.push(signature.substring(lastStart, i));
					lastStart = i + 2;
				}
				break;
		}
	}
	return { params: [], returnType: '' };
}

export function canonicalizeGOPATHPrefix(filename: string): string {
	const gopath: string = getCurrentGoPath();
	if (!gopath) {
		return filename;
	}
	const workspaces = gopath.split(path.delimiter);
	const filenameLowercase = filename.toLowerCase();

	// In case of multiple workspaces, find current workspace by checking if current file is
	// under any of the workspaces in $GOPATH
	let currentWorkspace: string = null;
	for (const workspace of workspaces) {
		// In case of nested workspaces, (example: both /Users/me and /Users/me/a/b/c are in $GOPATH)
		// both parent & child workspace in the nested workspaces pair can make it inside the above if block
		// Therefore, the below check will take longer (more specific to current file) of the two
		if (
			filenameLowercase.substring(0, workspace.length) === workspace.toLowerCase() &&
			(!currentWorkspace || workspace.length > currentWorkspace.length)
		) {
			currentWorkspace = workspace;
		}
	}

	if (!currentWorkspace) {
		return filename;
	}
	return currentWorkspace + filename.slice(currentWorkspace.length);
}

/**
 * Gets a numeric hash based on given string.
 * Returns a number between 0 and 4294967295.
 */
export function getStringHash(value: string): number {
	let hash = 5381;
	let i = value.length;

	while (i) {
		hash = (hash * 33) ^ value.charCodeAt(--i);
	}

	/* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
	 * integers. Since we want the results to be always positive, convert the
	 * signed int to an unsigned by doing an unsigned bitshift. */
	return hash >>> 0;
}

export function getUserNameHash() {
	if (userNameHash) {
		return userNameHash;
	}
	try {
		userNameHash = getStringHash(os.userInfo().username);
	} catch (error) {
		userNameHash = 1;
	}
	return userNameHash;
}

/**
 * Gets version of Go based on the output of the command `go version`.
 * Returns null if go is being used from source/tip in which case `go version` will not return release tag like go1.6.3
 */
export async function getGoVersion(): Promise<GoVersion> {
	const goRuntimePath = getBinPath('go');

	if (!goRuntimePath) {
		console.warn(
			`Failed to run "go version" as the "go" binary cannot be found in either GOROOT(${process.env['GOROOT']}) or PATH(${envPath})`
		);
		return Promise.resolve(null);
	}
	if (cachedGoVersion && (cachedGoVersion.sv || cachedGoVersion.isDevel)) {
		return Promise.resolve(cachedGoVersion);
	}
	return new Promise<GoVersion>((resolve) => {
		cp.execFile(goRuntimePath, ['version'], {}, (err, stdout, stderr) => {
			cachedGoVersion = new GoVersion(stdout);
			if (!cachedGoVersion.sv && !cachedGoVersion.isDevel) {
				if (err || stderr) {
					console.log(`Error when running the command "${goRuntimePath} version": `, err || stderr);
				} else {
					console.log(
						`Not able to determine version from the output of the command "${goRuntimePath} version": ${stdout}`
					);
				}
			}
			return resolve(cachedGoVersion);
		});
	});
}

/**
 * Returns boolean denoting if current version of Go supports vendoring
 */
export async function isVendorSupported(): Promise<boolean> {
	if (vendorSupport != null) {
		return Promise.resolve(vendorSupport);
	}
	const goVersion = await getGoVersion();
	if (!goVersion.sv) {
		return process.env['GO15VENDOREXPERIMENT'] === '0' ? false : true;
	}
	switch (goVersion.sv.major) {
		case 0:
			vendorSupport = false;
			break;
		case 1:
			vendorSupport =
				goVersion.sv.minor > 6 ||
					((goVersion.sv.minor === 5 || goVersion.sv.minor === 6) && process.env['GO15VENDOREXPERIMENT'] === '1')
					? true
					: false;
			break;
		default:
			vendorSupport = true;
			break;
	}
	return vendorSupport;
}

/**
 * Returns boolean indicating if GOPATH is set or not
 * If not set, then prompts user to do set GOPATH
 */
export function isGoPathSet(): boolean {
	if (!getCurrentGoPath()) {
		vscode.window
			.showInformationMessage(
				'Set GOPATH environment variable and restart VS Code or set GOPATH in Workspace settings',
				'Set GOPATH in Workspace Settings'
			)
			.then((selected) => {
				if (selected === 'Set GOPATH in Workspace Settings') {
					vscode.commands.executeCommand('workbench.action.openWorkspaceSettings');
				}
			});
		return false;
	}

	return true;
}

export function isPositionInString(document: vscode.TextDocument, position: vscode.Position): boolean {
	const lineText = document.lineAt(position.line).text;
	const lineTillCurrentPosition = lineText.substr(0, position.character);

	// Count the number of double quotes in the line till current position. Ignore escaped double quotes
	let doubleQuotesCnt = (lineTillCurrentPosition.match(/\"/g) || []).length;
	const escapedDoubleQuotesCnt = (lineTillCurrentPosition.match(/\\\"/g) || []).length;

	doubleQuotesCnt -= escapedDoubleQuotesCnt;
	return doubleQuotesCnt % 2 === 1;
}

export function getToolsGopath(useCache: boolean = true): string {
	if (!useCache || !toolsGopath) {
		toolsGopath = resolveToolsGopath();
	}
	return toolsGopath;
}

function resolveToolsGopath(): string {
	let toolsGopathForWorkspace = substituteEnv(getGoConfig()['toolsGopath'] || '');

	// In case of single root
	if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length <= 1) {
		return resolvePath(toolsGopathForWorkspace);
	}

	// In case of multi-root, resolve ~ and ${workspaceFolder}
	if (toolsGopathForWorkspace.startsWith('~')) {
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
		let toolsGopathFromConfig = <string>getGoConfig(folder.uri).inspect('toolsGopath').workspaceFolderValue;
		toolsGopathFromConfig = resolvePath(toolsGopathFromConfig, folder.uri.fsPath);
		if (toolsGopathFromConfig) {
			return toolsGopathFromConfig;
		}
	}
}

export function getBinPath(tool: string): string {
	const alternateTools: { [key: string]: string } = getGoConfig().get('alternateTools');
	const alternateToolPath: string = alternateTools[tool];

	return getBinPathWithPreferredGopath(
		tool,
		tool === 'go' ? [] : [getToolsGopath(), getCurrentGoPath()],
		resolvePath(alternateToolPath)
	);
}

export function getFileArchive(document: vscode.TextDocument): string {
	const fileContents = document.getText();
	return document.fileName + '\n' + Buffer.byteLength(fileContents, 'utf8') + '\n' + fileContents;
}

export function getToolsEnvVars(): any {
	const config = getGoConfig();
	const toolsEnvVars = config['toolsEnvVars'];

	const gopath = getCurrentGoPath();
	const envVars = Object.assign({}, process.env, gopath ? { GOPATH: gopath } : {});

	if (toolsEnvVars && typeof toolsEnvVars === 'object') {
		Object.keys(toolsEnvVars).forEach(
			(key) =>
				(envVars[key] =
					typeof toolsEnvVars[key] === 'string' ? resolvePath(toolsEnvVars[key]) : toolsEnvVars[key])
		);
	}

	return envVars;
}

export function substituteEnv(input: string): string {
	return input.replace(/\${env:([^}]+)}/g, (match, capture) => {
		return process.env[capture.trim()] || '';
	});
}

let currentGopath = '';
export function getCurrentGoPath(workspaceUri?: vscode.Uri): string {
	const activeEditorUri = vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri;
	const currentFilePath = fixDriveCasingInWindows(activeEditorUri && activeEditorUri.fsPath);
	const currentRoot = (workspaceUri && workspaceUri.fsPath) || getWorkspaceFolderPath(activeEditorUri);
	const config = getGoConfig(workspaceUri || activeEditorUri);

	// Infer the GOPATH from the current root or the path of the file opened in current editor
	// Last resort: Check for the common case where GOPATH itself is opened directly in VS Code
	let inferredGopath: string;
	if (config['inferGopath'] === true) {
		inferredGopath = getInferredGopath(currentRoot) || getInferredGopath(currentFilePath);
		if (!inferredGopath) {
			try {
				if (fs.statSync(path.join(currentRoot, 'src')).isDirectory()) {
					inferredGopath = currentRoot;
				}
			} catch (e) {
				// No op
			}
		}
		if (inferredGopath && process.env['GOPATH'] && inferredGopath !== process.env['GOPATH']) {
			inferredGopath += path.delimiter + process.env['GOPATH'];
		}
	}

	const configGopath = config['gopath'] ? resolvePath(substituteEnv(config['gopath']), currentRoot) : '';
	currentGopath = inferredGopath ? inferredGopath : configGopath || process.env['GOPATH'];
	return currentGopath;
}

export function getModuleCache(): string {
	if (currentGopath) {
		return path.join(currentGopath.split(path.delimiter)[0], 'pkg', 'mod');
	}
}

export class LineBuffer {
	private buf: string = '';
	private lineListeners: { (line: string): void }[] = [];
	private lastListeners: { (last: string): void }[] = [];

	public append(chunk: string) {
		this.buf += chunk;
		do {
			const idx = this.buf.indexOf('\n');
			if (idx === -1) {
				break;
			}

			this.fireLine(this.buf.substring(0, idx));
			this.buf = this.buf.substring(idx + 1);
		} while (true);
	}

	public done() {
		this.fireDone(this.buf !== '' ? this.buf : null);
	}

	public onLine(listener: (line: string) => void) {
		this.lineListeners.push(listener);
	}

	public onDone(listener: (last: string) => void) {
		this.lastListeners.push(listener);
	}

	private fireLine(line: string) {
		this.lineListeners.forEach((listener) => listener(line));
	}

	private fireDone(last: string) {
		this.lastListeners.forEach((listener) => listener(last));
	}
}

export function timeout(millis: number): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		setTimeout(() => resolve(), millis);
	});
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

/**
 * Returns the import path in a passed in string.
 * @param text The string to search for an import path
 */
export function getImportPath(text: string): string {
	// Catch cases like `import alias "importpath"` and `import "importpath"`
	const singleLineImportMatches = text.match(/^\s*import\s+([a-z,A-Z,_,\.]\w*\s+)?\"([^\"]+)\"/);
	if (singleLineImportMatches) {
		return singleLineImportMatches[2];
	}

	// Catch cases like `alias "importpath"` and "importpath"
	const groupImportMatches = text.match(/^\s*([a-z,A-Z,_,\.]\w*\s+)?\"([^\"]+)\"/);
	if (groupImportMatches) {
		return groupImportMatches[2];
	}

	return '';
}

// TODO: Add unit tests for the below

/**
 * Guess the package name based on parent directory name of the given file
 *
 * Cases:
 * - dir 'go-i18n' -> 'i18n'
 * - dir 'go-spew' -> 'spew'
 * - dir 'kingpin' -> 'kingpin'
 * - dir 'go-expand-tilde' -> 'tilde'
 * - dir 'gax-go' -> 'gax'
 * - dir 'go-difflib' -> 'difflib'
 * - dir 'jwt-go' -> 'jwt'
 * - dir 'go-radix' -> 'radix'
 *
 * @param {string} filePath.
 */
export function guessPackageNameFromFile(filePath: string): Promise<string[]> {
	return new Promise((resolve, reject) => {
		const goFilename = path.basename(filePath);
		if (goFilename === 'main.go') {
			return resolve(['main']);
		}

		const directoryPath = path.dirname(filePath);
		const dirName = path.basename(directoryPath);
		let segments = dirName.split(/[\.-]/);
		segments = segments.filter((val) => val !== 'go');

		if (segments.length === 0 || !/[a-zA-Z_]\w*/.test(segments[segments.length - 1])) {
			return reject();
		}

		const proposedPkgName = segments[segments.length - 1];

		fs.stat(path.join(directoryPath, 'main.go'), (err, stats) => {
			if (stats && stats.isFile()) {
				return resolve(['main']);
			}

			if (goFilename.endsWith('_test.go')) {
				return resolve([proposedPkgName, proposedPkgName + '_test']);
			}

			return resolve([proposedPkgName]);
		});
	});
}

export interface ICheckResult {
	file: string;
	line: number;
	col: number;
	msg: string;
	severity: string;
}

function deDupeDiagnostics(
	buildDiagnostics: vscode.Diagnostic[],
	otherDiagnostics: vscode.Diagnostic[]
): vscode.Diagnostic[] {
	const buildDiagnosticsLines = buildDiagnostics.map((x) => x.range.start.line);
	return otherDiagnostics.filter((x) => buildDiagnosticsLines.indexOf(x.range.start.line) === -1);
}

function mapSeverityToVSCodeSeverity(sev: string): vscode.DiagnosticSeverity {
	switch (sev) {
		case 'error':
			return vscode.DiagnosticSeverity.Error;
		case 'warning':
			return vscode.DiagnosticSeverity.Warning;
		default:
			return vscode.DiagnosticSeverity.Error;
	}
}

export function getWorkspaceFolderPath(fileUri?: vscode.Uri): string {
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

export function killProcess(p: cp.ChildProcess) {
	if (p) {
		try {
			p.kill();
		} catch (e) {
			console.log('Error killing process: ' + e);
			if (e && e.message && e.stack) {
				const matches = e.stack.match(/(src.go[a-z,A-Z]+\.js)/g);
				if (matches) {
				}
			}
		}
	}
}

export function killTree(processId: number): void {
	if (process.platform === 'win32') {
		const TASK_KILL = 'C:\\Windows\\System32\\taskkill.exe';

		// when killing a process in Windows its child processes are *not* killed but become root processes.
		// Therefore we use TASKKILL.EXE
		try {
			cp.execSync(`${TASK_KILL} /F /T /PID ${processId}`);
		} catch (err) {
			console.log('Error killing process tree: ' + err);
		}
	} else {
		// on linux and OS X we kill all direct and indirect child processes as well
		try {
			const cmd = path.join(__dirname, '../../../scripts/terminateProcess.sh');
			cp.spawnSync(cmd, [processId.toString()]);
		} catch (err) {
			console.log('Error killing process tree: ' + err);
		}
	}
}

export function rmdirRecursive(dir: string) {
	if (fs.existsSync(dir)) {
		fs.readdirSync(dir).forEach((file) => {
			const relPath = path.join(dir, file);
			if (fs.lstatSync(relPath).isDirectory()) {
				rmdirRecursive(dir);
			} else {
				fs.unlinkSync(relPath);
			}
		});
		fs.rmdirSync(dir);
	}
}

let tmpDir: string;

/**
 * Returns file path for given name in temp dir
 * @param name Name of the file
 */
export function getTempFilePath(name: string): string {
	if (!tmpDir) {
		tmpDir = fs.mkdtempSync(os.tmpdir() + path.sep + 'vscode-go');
	}

	if (!fs.existsSync(tmpDir)) {
		fs.mkdirSync(tmpDir);
	}

	return path.normalize(path.join(tmpDir, name));
}

export function cleanupTempDir() {
	if (tmpDir) {
		rmdirRecursive(tmpDir);
	}
	tmpDir = undefined;
}

/**
 * Returns a boolean whether the current position lies within a comment or not
 * @param document
 * @param position
 */
export function isPositionInComment(document: vscode.TextDocument, position: vscode.Position): boolean {
	const lineText = document.lineAt(position.line).text;
	const commentIndex = lineText.indexOf('//');

	if (commentIndex >= 0 && position.character > commentIndex) {
		const commentPosition = new vscode.Position(position.line, commentIndex);
		const isCommentInString = isPositionInString(document, commentPosition);

		return !isCommentInString;
	}
	return false;
}
