import { ProtocolNotificationType } from "vscode-languageserver-protocol";
import {
  ViewEditNotification,
  ViewEditParams,
  ViewOpenNotification,
  ViewOpenParams,
} from "../lsp/server/views";
import { NotificationSender, Notifier, ViewEvent, ViewModelChangeEvent } from "../views/events";
import { Disposable, Views } from "../views/types";

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
    disposables.push(client.start());
    await client.onReady();

    client.onNotification(ViewOpenNotification.type.method, (data: ViewOpenParams) => {
      data.views.forEach(async (view) => {
        await views.openView(view.key, view.model);
      });
    });

    client.onNotification(ViewEditNotification.type.method, (data: ViewEditParams) => {
      views.applyEdit(data.edits);
    });

    disposables.push(
      views.onDidOpenView(({ key }: ViewEvent) => notifier.sendViewDidOpen({ view: { key } }))
    );
    disposables.push(
      views.onDidCloseView((e: ViewEvent) => notifier.sendViewDidClose({ key: e.key }))
    );
    disposables.push(
      views.onDidShowView((e: ViewEvent) => notifier.sendViewDidShow({ key: e.key }))
    );
    disposables.push(
      views.onDidHideView((e: ViewEvent) => notifier.sendViewDidHide({ key: e.key }))
    );
    disposables.push(
      views.onDidChangeView(<T, D>(e: ViewModelChangeEvent<T, D>) =>
        notifier.sendViewDidChange({ key: e.key, modelChanges: [e.change] })
      )
    );

    return disposables;
  }

  dispose(): void {
    this.subscriptions.forEach((s) => s.dispose());
  }
}

/** An non-VS Code-specific interface for language clients. */
export interface LanguageClient extends NotificationSender {
  onReady: () => Thenable<void>;
  start(): Disposable;
  onNotification(method: string, listener: (e: any) => any);
  sendNotification<T>(notificationType: ProtocolNotificationType<T, void>, payload: T);
}

/** A language client that records interactions. */
export class LanguageClientSpy implements LanguageClient {
  started: boolean = false;
  listeners: { [key: string]: ((e: any) => any)[] } = {};
  received: [string, any][] = [];
  sent: [string, any][] = [];

  acceptNotification(method: string, payload: any): void {
    this.received.push([method, payload]);
    this.listeners[method]?.forEach((l) => l(payload));
  }

  onNotification(method: string, listener: (e: any) => any) {
    this.listeners[method] ??= [];
    this.listeners[method].push(listener);
  }

  sendNotification<T>(notificationType: ProtocolNotificationType<T, void>, payload: T) {
    this.sent.push([notificationType.method, payload]);
  }

  onReady(): Thenable<any> {
    return Promise.resolve();
  }

  start() {
    this.started = true;
    return { dispose: () => {} };
  }
}
