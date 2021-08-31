import fs from "fs";
import { Suite, Test } from "mocha";
import path from "path";

import {
  commands,
  ConfigurationTarget,
  Position,
  TextDocument,
  TextEditor,
  Uri,
  Webview,
  window,
  workspace,
} from "vscode";
import { PanelManager } from "../../editor/diagram";
import { checkSysl } from "../../tools/sysl_download";
import { DiagramModel } from "../../transform/mapper";

export class Input {
  /** Returns the position of the end of the document in editor. */
  static atEnd(editor: TextEditor): Position {
    const lastLine = editor.document.lineCount - 1;
    const lastCol = editor.document.lineAt(lastLine).text.length;
    return new Position(lastLine, lastCol);
  }

  /** Returns the definition of an app with nothing but a name. */
  static emptyApp(name: string): string {
    return `${name}:\n    ...\n`;
  }
}

/** Manages the contents of test fixture files in a directory. */
export class Fixtures {
  constructor(private readonly fixturesRoot: string) {}

  /** Reads the contents of the given files, and returns a function to reset them to that state. */
  prepare(relativePaths: string[]): () => Promise<void> {
    const realPaths = relativePaths.map((f) => path.join(this.fixturesRoot, f));
    const fixtureContents = realPaths.map((p) => fs.readFileSync(p).toString("utf-8"));

    return async () => {
      realPaths.forEach((p, i) => fs.writeFileSync(p, fixtureContents[i]));
    };
  }

  /** Opens a fixture in the workspace. */
  async open(relativePath: string): Promise<TextDocument> {
    const fsPath = path.join(this.fixturesRoot, relativePath);
    return await workspace.openTextDocument(Uri.file(fsPath));
  }

  /** Copies a file with source and destination paths relative to the fixture directory. */
  async cp(from: string, to: string, options?: any): Promise<void> {
    await workspace.fs.copy(
      Uri.file(path.resolve(this.fixturesRoot, from)),
      Uri.file(path.resolve(this.fixturesRoot, to)),
      options
    );
  }

  /** Creates a directory (and any missing ancestors) relative to the fixtures directory. */
  async mkdir(dirPath: string): Promise<void> {
    await workspace.fs.createDirectory(Uri.file(path.resolve(this.fixturesRoot, dirPath)));
  }

  /** Removes a file or directory relative to the fixtures directory. */
  async rm(rmPath: string): Promise<void> {
    await workspace.fs.delete(Uri.file(path.resolve(this.fixturesRoot, rmPath)), {
      recursive: true,
    });
  }
}

/** Takes screenshots of test diagrams. */
export class Screenshot {
  constructor(private readonly dir: string) {}

  /** Takes a screenshot of the current active diagram, or fails if there isn't one. */
  async ofDiagram(name?: string | Test | Suite): Promise<void> {
    name ||= new Date().toISOString().replace(/:/g, "-");
    if (typeof name !== "string") {
      name = testToFilename(name);
    }
    const shot = await new Diagram().getScreenshot();
    const shotBytes = new TextEncoder().encode(shot);
    const shotPath = Uri.file(path.join(this.dir, name + ".svg"));
    await workspace.fs.writeFile(shotPath, shotBytes);
  }
}

/** Exposes testing operations on diagrams. */
export class Diagram {
  /** Renders a diagram of the active document and waits to load and focus the webview. */
  async render(): Promise<void> {
    await commands.executeCommand("sysl.renderDiagram");
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  /** Closes all text editors, leaving only custom editors. */
  async closeOthers(): Promise<void> {
    // TODO: Replace deprecated hide() function with async command-driven logic.
    window.visibleTextEditors.forEach((ed) => ed.hide());
    // Allow some time to refresh the layout.
    await sleep(500);
  }

  /** Fetches the data rendered in the active GoJS diagram. */
  async getData(timeout: number = 2000): Promise<DiagramModel> {
    const webview: Webview = getActiveWebview()!;
    const dataEventType = "__test__gojs";
    return new Promise((resolve, reject) => {
      let h;
      const listener = webview.onDidReceiveMessage((e: MessageEvent) => {
        if (e.type === dataEventType) {
          resolve((e as any).diagram);
        }
        clearTimeout(h);
        listener.dispose();
      });
      h = setTimeout(() => {
        reject(new Error(`timeout waiting for ${dataEventType} response`));
        listener.dispose();
      }, timeout);
      webview.postMessage({ type: dataEventType });
    });
  }

  /** Fetches an SVG rendering of the active GoJS diagram. */
  async getScreenshot(timeout: number = 10000): Promise<string> {
    const webview: Webview = getActiveWebview()!;
    const screenshotEventType = "__test__gojs_svg";
    return new Promise((resolve, reject) => {
      let h;
      const listener = webview.onDidReceiveMessage((e: MessageEvent) => {
        if (e.type === screenshotEventType) {
          resolve((e as any).diagram);
        }
        clearTimeout(h);
        listener.dispose();
      });
      h = setTimeout(() => {
        reject(new Error(`timeout waiting for ${screenshotEventType} response`));
        listener.dispose();
      }, timeout);
      webview.postMessage({ type: screenshotEventType });
    });
  }
}

/** Provides operations on extension-related tools. */
export class Tools {
  /** Ensures the Sysl binary config points to something. */
  static async locateSyslBinary() {
    try {
      await checkSysl("sysl");
    } catch (e) {
      // In CI, the Sysl binary is downloaded to the working directory (repo root).
      await checkSysl(path.resolve(__dirname, "../../../sysl"));
      await workspace
        .getConfiguration()
        .update("sysl.tool.binaryPath", "./sysl", ConfigurationTarget.Global);
    }
  }
}

/** Returns the active webview, or undefined if there isn't one. */
export function getActiveWebview(): Webview | undefined {
  const manager = (global as any).__test__.panelManager as PanelManager;
  return manager.getActivePanel()?.webview;
}

/** Pauses the test execution for some time while the UI processes. */
export function sleep(timeMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeMs));
}

/** Returns a filename representing a given test. Parent tests/suites are encoded as directories. */
function testToFilename(test: Test | Suite): string {
  let name = test.title;
  if (test.parent) {
    name = path.join(testToFilename(test.parent), name);
  }
  return name;
}
