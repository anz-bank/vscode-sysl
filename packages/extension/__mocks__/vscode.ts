export const StatusBarAlignment = {};

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export const Diagnostic = jest.fn();
export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

export interface Disposable {
  dispose: () => void;
}

export const ExtensionContext = {};

export enum ProgressLocation {
  SourceControl = 1,
  Window = 10,
  Notification = 15,
}

// @ts-ignore
export const Range = jest.fn();

export const TextDocument = {};

export const Uri = {
  file: (f: string) => f,
  parse: jest.fn(),
};

export const WebviewPanel = {};

// Namespaces

export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn(),
};

export const debug = {
  onDidTerminateDebugSession: jest.fn(),
  startDebugging: jest.fn(),
};

export const languages = {
  createDiagnosticCollection: jest.fn(),
};

// @ts-ignore
export const window = {
  activeTextEditor: undefined,
  createOutputChannel: jest.fn(() => ({ appendLine: console.log })),
  createStatusBarItem: jest.fn(() => ({
    show: jest.fn(),
  })),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  createTextEditorDecorationType: jest.fn(),
  withProgress: jest.fn((_, f: (progress: any) => void) => {
    const progress = { report: () => {} };
    return f(progress);
  }),
};

export const workspace = {
  getConfiguration: jest.fn(),
  workspaceFolders: [],
  onDidChangeTextDocument: jest.fn(),
  onDidSaveTextDocument: jest.fn(),
  onDidOpenTextDocument: jest.fn(),
  onDidCloseTextDocument: jest.fn(),
  openTextDocument: jest.fn(),
};
