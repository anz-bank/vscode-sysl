/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
// Forked and modidified on 1st of April 2020
'use strict';

import vscode = require('vscode');
import { GO_MODE } from './goMode';

export let outputChannel = vscode.window.createOutputChannel('Sysl');

export let diagnosticsStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

let statusBarEntry: vscode.StatusBarItem;
const statusBarItemModule = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
statusBarItemModule.text = '$(megaphone) Go Modules';
statusBarItemModule.tooltip =
	'Modules is enabled for this project. Click to learn more about Modules support in VS Code.';
statusBarItemModule.command = 'go.open.modulewiki';

export function showHideStatus(editor: vscode.TextEditor) {
	if (statusBarEntry) {
		if (!editor) {
			statusBarEntry.hide();
		} else if (vscode.languages.match(GO_MODE, editor.document)) {
			statusBarEntry.show();
		} else {
			statusBarEntry.hide();
		}
	}

	if (!editor) {
		statusBarItemModule.hide();
	}
}

export function hideGoStatus() {
	if (statusBarEntry) {
		statusBarEntry.dispose();
	}
}

export function showGoStatus(message: string, command: string, tooltip?: string) {
	statusBarEntry = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Number.MIN_VALUE);
	statusBarEntry.text = `$(alert) ${message}`;
	statusBarEntry.command = command;
	statusBarEntry.tooltip = tooltip;
	statusBarEntry.show();
}
