import { window } from "vscode";

/** The standard Sysl file extension. */
export const syslExt = ".sysl";

/** The command to install the Sysl LSP server. */
export const installSyslLspCommand = "sysl.tools.installSyslLsp";

/** The custom editor type. */
export const customViewType = "sysl.gojsDiagram";

/** The configuration key for the path to a custom Sysl binary. */
export const syslBinaryPath = "sysl.tool.binaryPath";
export const syslToolAutoupdate = "sysl.tool.autoupdate";
export const syslPluginsFetchFromNetwork = "sysl.plugins.fetchFromNetwork";

/** The command to render a Sysl document as a diagram. */
export const renderDiagramCommand: TextEditorCommand = "sysl.renderDiagram";
export const importCommand: TextEditorCommand = "sysl.import";

/** ID of a command to execute from a Sysl text editor. */
export type TextEditorCommand = "sysl.renderDiagram" | "sysl.import";

/** ID of a command to execute from a Sysl diagram custom editor. */
export type CustomEditorCommand = "sysl.diagram.snapshot";

/** Map of text editor commands to handlers to ensure handling of all cases. */
export type TextEditorCommandMap = { [key in TextEditorCommand]: (...args: any[]) => any };
/** Map of diagram editor commands to handlers to ensure handling of all cases. */
export type CustomEditorCommandMap = { [key in CustomEditorCommand]: (...args: any[]) => any };

/** Output channel to write extension logs to. Each plugin receives its own channel. */
export const output = window.createOutputChannel("Sysl");
