import { Disposable } from "@anz-bank/vscode-sysl-model";
import { Action } from "@anz-bank/vscode-sysl-plugin";
import { fromPairs, isString, partition } from "lodash";
import { commands, ProgressLocation, QuickPickOptions, TextDocument, window } from "vscode";
import { output, syslExt } from "../constants";
import { Sysl } from "../tools/sysl";

/** Maintains a registry of {@link Action}s and binds them to VS Code affordances. */
class Actions {
  private readonly actions: { [key: string]: Action } = {};
  private sysl?: Sysl;

  public activate(sysl: Sysl): Disposable {
    this.sysl = sysl;
    return this.registerListCommand();
  }

  /**
   * Registers the "list actions" command, with a callback to invoke the selected action, and a
   * command of the form {@code "action:<id>"} for each action ID to invoke it directly.
   */
  private registerListCommand(): Disposable {
    return commands.registerCommand("sysl.action.list", () => {
      const nameToId: { [key: string]: string } = fromPairs(
        // Fallback to `.action` for backwards compatibility (< v0.6.0).
        Object.values(this.actions).map((a) => [toLabel(a), a.id ?? (a as any).action])
      );

      const opts: QuickPickOptions = { title: "Sysl actions: Select action to perform" };
      window.showQuickPick(Object.keys(nameToId), opts).then((name) => {
        const id = name && nameToId[name];
        if (!id) return;
        this.invoke(id);
      });
    });
  }

  /** Handles the invocation of an action. */
  invoke(actionOrId: string | Action): void {
    const action: Action | undefined = isString(actionOrId) ? this.actions[actionOrId] : actionOrId;
    if (!action) {
      output.appendLine(`error: no action with ID ${actionOrId}`);
      return;
    }

    const title = toLabel(action);
    output.appendLine(`invoking action "${title}" (${action.id})...`);

    window.withProgress({ location: ProgressLocation.Notification, title }, async () => {
      const doc = window.activeTextEditor?.document;
      let model: string | undefined = undefined;
      if (doc && doc.uri.fsPath.endsWith(syslExt)) {
        model = await compileDoc(doc, this.sysl!).catch(() => undefined);
      }
      await commands.executeCommand(action.id, { uri: doc?.uri.toString(), model });
    });
  }

  /**
   * Adds actions to the internal registry and registers {@code "action:<id>"} commands to invoke
   * each one.
   */
  async addActions(actions: Action[]): Promise<Disposable> {
    // Check against existing commands, since plugins may restart and re-initialize if they crash.
    const existing = await commands.getCommands();
    const [conflict, fresh] = partition(
      actions.map((a) => [`action:${a.id}`, a]),
      ([cmd]) => existing.includes(cmd)
    ) as [[string, Action][], [string, Action][]];
    if (conflict.length) {
      output.appendLine(`addActions: ignoring existing commands: [${conflict.map(([c]) => c)}]`);
    }
    const disposables = fresh.map(([cmd, a]) => {
      output.appendLine(`adding action ${a.id} (command ${cmd})`);
      this.actions[a.id] = a;
      return commands.registerCommand(cmd, () => this.invoke(a.id));
    });
    return { dispose: () => disposables.forEach((d) => d.dispose()) };
  }

  public setSysl(sysl: Sysl) {
    this.sysl = sysl;
  }
}

export default new Actions();

/** Returns a label string describing an action. */
function toLabel(a: Action) {
  return (a.category ? `${a.category}: ` : "") + a.title;
}

async function compileDoc(doc: TextDocument, sysl: Sysl): Promise<string> {
  return (await sysl.protobufFromSource(doc.getText(), doc.uri.fsPath)).toString("utf-8");
}
