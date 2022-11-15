import { Disposable } from "@anz-bank/vscode-sysl-model";
import {
  ViewEditNotification,
  ViewEditParams,
  ViewModel,
  ViewOpenNotification,
  ViewOpenParams,
} from "@anz-bank/vscode-sysl-plugin";
import { ProtocolNotificationType } from "vscode-languageserver-protocol";
import { NotificationSender, Notifier, ViewEvent, ViewModelChangeEvent } from "../views/events";
import { View, Views } from "../views/types";

/**
 * Routes events between a plugin and the renderer.
 *
 * The router receives plugin events via {@link client} and forwards those that are relevent to the
 * renderer via {@link views}. Similarly, events emitted by the renderer are received via listeners
 * in {@link views} and forwarded to the plugin via {@link client} (using a {@link Notifier}).
 */
export class LspPluginClientRouter implements Disposable {
  private readonly notifier: Notifier;
  private readonly subscriptions: Disposable[] = [];

  constructor(private readonly views: Views, private readonly client: LanguageClient) {
    this.notifier = new Notifier(client);
  }

  async start(): Promise<Disposable[]> {
    const { client, views, notifier } = this;
    const disposables: Disposable[] = [];
    await client.start();

    client.onNotification(ViewOpenNotification.type, (data: ViewOpenParams) => {
      data.views.forEach(async (view) => {
        await views.openView(view.key, view.model);
      });
    });

    client.onNotification(ViewEditNotification.type, (data: ViewEditParams) => {
      views.applyEdit(data.edits);
    });

    disposables.push(
      views.onDidOpenView(({ key, model }: ViewEvent<ViewModel>) =>
        notifier.sendViewDidOpen({ view: { key, model } })
      )
    );
    disposables.push(
      views.onDidChangeView(<T extends ViewModel, D>(e: ViewModelChangeEvent<T, D>) =>
        notifier.sendViewDidChange({ key: e.key, modelChanges: [e.change] })
      )
    );
    disposables.push(
      views.onDidCloseView(({ key }: ViewEvent<ViewModel>) => notifier.sendViewDidClose({ key }))
    );
    disposables.push(
      views.onDidShowView(({ key }: ViewEvent<ViewModel>) => notifier.sendViewDidShow({ key }))
    );
    disposables.push(
      views.onDidHideView(({ key }: ViewEvent<ViewModel>) => notifier.sendViewDidHide({ key }))
    );

    // Notify the server about all views that are already open (race condition).
    views.getAllViews().forEach(({ key }: View<any, any>) => {
      notifier.sendViewDidOpen({ view: { key } });
    });

    return disposables;
  }

  dispose(): void {
    this.subscriptions.forEach((s) => s.dispose());
  }
}

/** A non-VS Code-specific interface for language clients. */
export interface LanguageClient extends NotificationSender {
  start(): Promise<void>;
  onNotification<T>(type: ProtocolNotificationType<T, void>, listener: (e: T) => any): void;
  sendNotification<T>(notificationType: ProtocolNotificationType<T, void>, payload: T): void;
}

/** A language client that records interactions. */
export class LanguageClientSpy implements LanguageClient {
  started: boolean = false;

  listeners: { [key: string]: ((e: any) => any)[] } = {};
  received: [string, any][] = [];
  sent: [string, any][] = [];

  acceptNotification<T>(type: ProtocolNotificationType<T, void>, payload: any): void {
    this.received.push([type.method, payload]);
    this.listeners[type.method]?.forEach((l) => l(payload));
  }
  onNotification<T>(type: ProtocolNotificationType<T, void>, listener: (e: any) => any) {
    this.listeners[type.method] ??= [];
    this.listeners[type.method].push(listener);
  }

  sendNotification<T>(
    notificationType: ProtocolNotificationType<T, void>,
    payload: T
  ): Promise<void> {
    this.sent.push([notificationType.method, payload]);
    return Promise.resolve();
  }

  start(): Promise<void> {
    this.started = true;
    return Promise.resolve();
  }
}
