import { URI } from "vscode-uri";
import { ViewKey } from "../key";
import { Disposable, ViewModel, ViewModelDelta } from "../types";

/** Stub for the VS Code Webview interface. */
export interface Webview {
  html: string;
  options: any;
  readonly onDidReceiveMessage: <T extends WebviewEvent>(listener: (e: T) => any) => Disposable;
  postMessage(message: any): Thenable<boolean>;
  asWebviewUri(localResource: URI): URI;
}

/** An event emitted by a webview to report some action. */
export type WebviewEvent =
  | ViewsDidOpenMessage
  | ViewsDidCloseMessage
  | ViewDidChangeMessage
  | ViewsDidOpenMessage
  | ViewsDidCloseMessage;

/** Signals that a view was opened. */
export interface ViewsDidOpenMessage {
  type: "view/didOpen";
  key: ViewKey;
  model: ViewModel;
}

/** Signals that a view was closed. */
export interface ViewsDidCloseMessage {
  type: "view/didClose";
  key: ViewKey;
}

/** Signals that a view model was changed. */
export interface ViewDidChangeMessage {
  type: "view/didChange";
  key: ViewKey;
  model: ViewModel;
  delta: ViewModelDelta;
}

/** Signals that a view was shown (previously hidden). */
export interface ViewsDidShowMessage {
  type: "view/didShow";
  key: ViewKey;
}

/** Signals that a view was hidden (previously shown). */
export interface ViewsDidHideMessage {
  type: "view/didHide";
  key: ViewKey;
}
