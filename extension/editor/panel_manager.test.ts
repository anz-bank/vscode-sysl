import { expect } from "chai";
import { WebviewPanel } from "vscode";
import { PanelManager } from "./panel_manager";

suite("panel manager", () => {
  let panelManager: PanelManager;

  setup(() => {
    panelManager = new PanelManager();
  });

  test("empty", async () => {
    expect(panelManager.getActivePanel()).to.be.undefined;
  });

  suite("single", () => {
    test("active", async () => {
      const panel = { active: true } as WebviewPanel;
      panelManager.addPanel(panel);
      expect(panelManager.getActivePanel()).to.equal(panel);
    });

    test("inactive", async () => {
      const panel = { active: false } as WebviewPanel;
      panelManager.addPanel(panel);
      expect(panelManager.getActivePanel()).to.be.undefined;
    });
  });

  suite("multiple", () => {
    const active = { active: true } as WebviewPanel;
    const panels: WebviewPanel[] = [
      { active: false } as WebviewPanel,
      active,
      { active: false } as WebviewPanel,
    ];
    test("single active", async () => {
      panels.forEach((panel) => panelManager.addPanel(panel));

      expect(panelManager.getActivePanel()).to.equal(active);
    });

    test("inactive", async () => {
      const panels: WebviewPanel[] = [
        { active: false } as WebviewPanel,
        { active: false } as WebviewPanel,
        { active: false } as WebviewPanel,
      ];
      panels.forEach((panel) => panelManager.addPanel(panel));

      expect(panelManager.getActivePanel()).to.be.undefined;
    });
  });

  suite("dispose", () => {
    const [one, two, three] = [
      { active: false } as WebviewPanel,
      { active: true } as WebviewPanel,
      { active: false } as WebviewPanel,
    ];
    const panels = [one, two, three];

    test("empty", () => {
      panelManager.disposePanel({} as WebviewPanel);
      // Should not fail.
    });

    test("of active", () => {
      panels.forEach((panel) => panelManager.addPanel(panel));
      panelManager.disposePanel(two);

      expect(panelManager.getActivePanel()).to.be.undefined;
    });

    test("of inactive", () => {
      panels.forEach((panel) => panelManager.addPanel(panel));
      panelManager.disposePanel(one);

      expect(panelManager.getActivePanel()).to.equal(two);
    });
  });
});
