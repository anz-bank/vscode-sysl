import { window } from "vscode";

/** The command to install the Sysl LSP server. */
export const installSyslLspCommand = "sysl.tools.installSyslLsp";

/** The custom editor type. */
export const customViewType = "sysl.gojsDiagram";

/** The configuration key for the path to a custom Sysl binary. */
export const syslBinaryPath = "sysl.tool.binaryPath";

/** The command to render a Sysl document as a diagram. */
export const renderDiagramCommand: TextEditorCommand = "sysl.renderDiagram";

/** ID of a command to execute from a Sysl text editor. */
export type TextEditorCommand = "sysl.renderDiagram";

/** ID of a command to execute from a Sysl diagram custom editor. */
export type CustomEditorCommand = "sysl.diagram.snapshot";

/** Map of text editor commands to handlers to ensure handling of all cases. */
export type TextEditorCommandMap = { [key in TextEditorCommand]: (...args: any[]) => any };
/** Map of diagram editor commands to handlers to ensure handling of all cases. */
export type CustomEditorCommandMap = { [key in CustomEditorCommand]: (...args: any[]) => any };

/** The remote URL from which to fetch network plugins. */
export const remoteUrl = "http://go/vscode-sysl-plugins";

export const output = window.createOutputChannel("Sysl");
