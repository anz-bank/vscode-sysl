import { expect } from "chai";
import fs from "fs";
import { Suite, Test } from "mocha";
import retry from "p-retry";
import path from "path";

import {
  commands,
  ConfigurationTarget,
  GlobPattern,
  Position,
  TextDocument,
  TextEditor,
  Uri,
  Webview,
  workspace,
} from "vscode";
import { renderDiagramCommand, syslBinaryPath } from "../../constants";
import { CustomEditorManager } from "../../editor/custom_editors";
import { checkSysl } from "../../tools/sysl_download";
import { DiagramModel } from "../../views/diagram/model";

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

  /** Inserts content into editor at position. Resolves to {@code true} if the edit was applied. */
  static async into(editor: TextEditor, content: string, position?: Position): Promise<boolean> {
    return await editor.edit((builder) => {
      position ??= Input.atEnd(editor);
      console.log(`inserting "${content}" at`, position);
      builder.insert(position, content);
    });
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
      // Wait for the document buffers to be updated.
      await new Promise((resolve) => setTimeout(resolve, 500));
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

  /** Returns an array of files matching the search pattern(s). */
  async find(include: GlobPattern, exclude?: GlobPattern): Promise<Uri[]> {
    return await workspace.findFiles(include, exclude);
  }
}

export type Comparison<T> = {
  before: T;
  after: T;
};

function formatXML(xml: string, tab: string = "\t", nl: string = "\n"): string {
  let formatted = "";
  let indent = "";
  xml = xml.replace(/mainClip\d+/g, "mainClipTEST");
  const nodes = xml.slice(1, -1).split(/>\s*</);
  if (nodes[0][0] == "?") {
    formatted += "<" + nodes.shift() + ">" + nl;
  }
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node[0] == "/") {
      indent = indent.slice(tab.length); // decrease indent
    }
    formatted += indent + "<" + node + ">" + nl;
    if (node[0] != "/" && node[node.length - 1] != "/" && node.indexOf("</") == -1) {
      indent += tab; // increase indent
    }
  }
  return formatted;
}

/** Takes screenshots of test diagrams. */
export class Screenshot {
  constructor(private readonly dir: string) {}

  filenameFor(name?: string | Test | Suite, suffix: string = ""): Uri {
    name ||= new Date().toISOString().replace(/:/g, "-");
    if (typeof name !== "string") {
      name = testToFilename(name);
    }
    return Uri.file(path.join(this.dir, name + suffix + ".svg"));
  }

  /** Takes a screenshot of the current active diagram, or fails if there isn't one. */
  async write(name: string | Test | Suite): Promise<void> {
    this.save(name, await new Diagram().getScreenshot());
  }

  async save(name: string | Test | Suite, content: string, suffix?: string): Promise<string> {
    const shotBytes = new TextEncoder().encode(content);
    const filename = this.filenameFor(name, suffix);
    await workspace.fs.writeFile(filename, shotBytes);
    return filename.fsPath;
  }

  /** Returns a comparison of a screenshot of the current diagram with one previously taken. */
  async compare(name: string | Test | Suite): Promise<Comparison<string | undefined>> {
    const [before, after] = await Promise.all([
      workspace.fs.readFile(this.filenameFor(name)).then(
        (x) => x,
        () => undefined
      ),
      new Diagram().getScreenshot(),
    ]);
    return {
      before: before && new TextDecoder().decode(before),
      after: formatXML(after),
    };
  }

  /**
   * Compares the current diagram ("after") to the previously saved one ("before").
   *
   * <li>If before does not exist but after does, writes the after to disk as the new "before" without assertion.
   * <li>Otherwise, expects both before and after exist, and expects that both are equal, failing if not.
   */
  async compareExpectAndWrite(name: string | Test | Suite) {
    const { before, after } = await this.compare(name);
    if (!before && after) {
      const filename = await this.save(name, after);
      console.warn(`new screenshot for ${filename}`);
    } else {
      try {
        expect(before).to.not.be.null;
        expect(after).to.not.be.null;
        expect(after).to.equal(before);
      } catch (e) {
        after && (await this.save(name!, after, "_after"));
        throw e;
      }
    }
  }

  /**
   * Compares the current diagram ("after") to the previously saved one ("before"), and restores the
   * UI from fullscreen render mode.
   */
  async compareExpectWriteAndRestore(name: string | Test | Suite) {
    try {
      this.compareExpectAndWrite(name);
    } finally {
      await commands.executeCommand("workbench.action.toggleSidebarVisibility");
    }
  }
}

/** Exposes testing operations on diagrams. */
export class Diagram {
  /** Renders a diagram of the active document and waits to load and focus the webview. */
  async render(): Promise<void> {
    await commands.executeCommand(renderDiagramCommand);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await allSettled();
  }

  /**
   * Renders a diagram of the active document, closes other tabs and panes, and waits to load and
   * focus the webview.
   */
  async renderFull(): Promise<void> {
    await this.render();
    await this.maximize();
  }

  /**
   * Closes other tabs and panes, and waits to load and focus the webview.
   */
  async maximize(): Promise<void> {
    await this.closeOthers();
    await commands.executeCommand("workbench.action.closeSidebar");
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  /** Closes all non-active editors. */
  async closeOthers(): Promise<void> {
    await commands.executeCommand("workbench.action.closeOtherEditors");
    await commands.executeCommand("workbench.action.closeEditorsInOtherGroups");
    // Allow some time to refresh the layout.
    await sleep(500);
  }

  /** Fetches the data rendered in the active GoJS diagram. */
  async getData(timeout?: number): Promise<DiagramModel> {
    console.log("fetching data from current diagram");
    return (await this.getFromWebview("__test__gojs", {}, timeout)).diagram;
  }

  /** Fetches an SVG rendering of the active GoJS diagram. */
  async getScreenshot(timeout?: number): Promise<string> {
    console.log("taking screenshot of current diagram");
    return (await this.getFromWebview("__test__gojs_svg", {}, timeout)).diagram;
  }

  /** Selects a view tab by label in the renderer. */
  async selectTab(label: string, timeout?: number): Promise<boolean> {
    console.log(`selecting tab with label "${label}"`);
    return (await this.getFromWebview("__test__selectTab", { label }, timeout)).status;
  }

  /** Fetches an SVG rendering of the active GoJS diagram. */
  async getFromWebview(eventType: string, payload: any = {}, timeout: number = 5000): Promise<any> {
    const callbackTimeout = 1000;
    const run = async () => {
      const webview: Webview = getActiveWebview()!;
      return new Promise((resolve, reject) => {
        let callbackTimeoutHandle;
        const listener = webview.onDidReceiveMessage((e: MessageEvent) => {
          if (e.type === eventType) {
            resolve(e);
            clearTimeout(callbackTimeoutHandle);
            listener.dispose();
          }
        });
        callbackTimeoutHandle = setTimeout(() => {
          reject(new Error(`timeout waiting for ${eventType} response`));
          listener.dispose();
        }, callbackTimeout);
        webview.postMessage({ ...payload, type: eventType });
      });
    };
    return retry(run, { maxRetryTime: timeout });
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
        .update(syslBinaryPath, "./sysl", ConfigurationTarget.Global);
    }
  }
}

/** Interface between test framework and application code. */
export interface TestInstrumentation {
  // Resolves when the extension is activated and ready for testing.
  isActivated: Promise<void>;

  // Must be invoked by the extension after completing activation.
  onActivated: () => void;
}

/** Returns a promise that resolves once the extension is activated. */
export async function isActivated(): Promise<void> {
  var promiseResolve;
  const promise = new Promise<void>((resolve) => {
    promiseResolve = resolve;
  });

  const __test__: TestInstrumentation = {
    onActivated: promiseResolve,
    isActivated: promise,
  };
  (global as any).__test__ = __test__;
  return promise;
}

/** Returns the active webview, or undefined if there isn't one. */
export function getActiveWebview(): Webview | undefined {
  const manager = (global as any).__test__.customEditorManager as CustomEditorManager;
  return manager.activeCustomEditor?.webviewPanel.webview;
}

/** Pauses the test execution for some time while the UI processes. */
export function sleep(timeMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeMs));
}

/** Returns a promise that resolves once all child processes have finished. */
export async function allSettled(): Promise<void> {
  await (global as any).__executor__.allSettled();
}

/** Returns a filename representing a given test. Parent tests/suites are encoded as directories. */
function testToFilename(test: Test | Suite): string {
  let name = test.title;
  if (test.parent) {
    name = path.join(testToFilename(test.parent), name);
  }
  return name;
}
