import { ViewKey } from "@anz-bank/vscode-sysl-model";
import {
  ViewDidChangeNotification,
  ViewDidChangeParams,
  ViewDidCloseNotification,
  ViewDidCloseParams,
  ViewDidHideNotification,
  ViewDidHideParams,
  ViewDidOpenNotification,
  ViewDidOpenParams,
  ViewDidShowNotification,
  ViewDidShowParams,
  ViewModel,
} from "@anz-bank/vscode-sysl-plugin";
import { ProtocolNotificationType } from "vscode-languageserver/node";
import { Document } from "../plugins/types";

/** An event that occurred in or around a view. */
export interface ViewEvent<T extends ViewModel> {
  key: ViewKey;
  model?: T;
  document?: Document;
}

/**
 * Signals a change in a view model resulting from a change to the view.
 *
 * This is not emitted following changes to the model from outside sources.
 */
export interface ViewModelChangeEvent<T, D> extends ViewEvent<T> {
  change: D;
}

/** A sender of LSP notifications. */
export interface NotificationSender {
  sendNotification<T>(notificationType: ProtocolNotificationType<T, void>, payload: T): void;
}

/** Manages the sending of notifications to the server. */
export class Notifier {
  constructor(private readonly client: NotificationSender) {}

  sendViewDidOpen(payload: ViewDidOpenParams) {
    this.send(ViewDidOpenNotification.type, payload);
  }
  sendViewDidClose(payload: ViewDidCloseParams) {
    this.send(ViewDidCloseNotification.type, payload);
  }
  sendViewDidShow(payload: ViewDidShowParams) {
    this.send(ViewDidShowNotification.type, payload);
  }
  sendViewDidHide(payload: ViewDidHideParams) {
    this.send(ViewDidHideNotification.type, payload);
  }
  sendViewDidChange(payload: ViewDidChangeParams<any>) {
    this.send(ViewDidChangeNotification.type, payload);
  }

  send<T>(notificationType: ProtocolNotificationType<T, void>, payload: T): void {
    this.client.sendNotification<T>(notificationType, payload);
  }
}
