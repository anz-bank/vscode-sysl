import { TextEditor } from "vscode";

/** The command to install the Sysl LSP server. */
export const installSyslLspCommand = "sysl.tools.installSyslLsp";

/** The custom editor type. */
export const customViewType = "sysl.gojsDiagram";

/** The configuration key for the path to a custom Sysl binary. */
export const syslBinaryPath = "sysl.tool.binaryPath";

export type TextEditorCommand = "sysl.renderDiagram";

export type CustomEditorCommand =
  | "sysl.diagram.toggleComponentTree"
  | "sysl.diagram.toggleDescriptionPane";

export type TextEditorCommandMap = { [key in TextEditorCommand]: (editor: TextEditor) => any };
export type CustomEditorCommandMap = { [key in CustomEditorCommand]: (...args: any[]) => any };
