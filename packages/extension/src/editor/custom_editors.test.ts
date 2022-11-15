import { expect } from "chai";
import { TextDocument, WebviewPanel } from "vscode";
import { CustomEditor, CustomEditorManager } from "./custom_editors";

const noopDisposable = { dispose: () => {} };

describe("custom editor manager", () => {
  let panelManager: CustomEditorManager;

  beforeEach(() => {
    panelManager = new CustomEditorManager();
  });

  test("empty", async () => {
    expect(panelManager.activeCustomEditor).to.be.undefined;
  });

  describe("single", () => {
    test("active", async () => {
      const editor = fakeEditor(true);
      panelManager.addEditor(editor);
      expect(panelManager.activeCustomEditor).to.equal(editor);
    });

    test("inactive", async () => {
      const editor = fakeEditor(false);
      panelManager.addEditor(editor);
      expect(panelManager.activeCustomEditor).to.be.undefined;
    });
  });

  describe("multiple", () => {
    const active = fakeEditor(true);
    const panels: CustomEditor[] = [fakeEditor(false), active, fakeEditor(false)];
    test("single active", async () => {
      panels.forEach((panel) => panelManager.addEditor(panel));

      expect(panelManager.activeCustomEditor).to.equal(active);
    });

    test("inactive", async () => {
      const panels: CustomEditor[] = [fakeEditor(false), fakeEditor(false), fakeEditor(false)];
      panels.forEach((panel) => panelManager.addEditor(panel));

      expect(panelManager.activeCustomEditor).to.be.undefined;
    });
  });

  describe("dispose", () => {
    const editors = [fakeEditor(false), fakeEditor(true), fakeEditor(false)];
    const [one, two] = editors;

    test("empty", () => {
      panelManager.disposeEditor({} as CustomEditor);
      // Should not fail.
    });

    test("of active", () => {
      editors.forEach((panel) => panelManager.addEditor(panel));
      panelManager.disposeEditor(two);

      expect(panelManager.activeCustomEditor).to.be.undefined;
    });

    test("of inactive", () => {
      editors.forEach((panel) => panelManager.addEditor(panel));
      panelManager.disposeEditor(one);

      expect(panelManager.activeCustomEditor).to.equal(two);
    });
  });
});

function fakeEditor(active: boolean): CustomEditor {
  return new CustomEditor(
    {} as TextDocument,
    {
      active,
      onDidChangeViewState: () => noopDisposable,
      ...noopDisposable,
    } as any as WebviewPanel
  );
}
