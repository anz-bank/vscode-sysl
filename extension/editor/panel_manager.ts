import { WebviewPanel } from "vscode";

import { pull } from "lodash";

/**
 * Stores a collection of WebviewPanels for retrieval by tests.
 *
 * Exported for testing only. Application code should use the singleton instance.
 */
export class PanelManager {
  /** Array of WebviewPanels that have been created to find the active one. */
  private webviewPanels: WebviewPanel[] = [];

  /** Returns the active WebviewPanel if there is one, or undefined. */
  public getActivePanel(): WebviewPanel | undefined {
    return this.webviewPanels.find((p) => p.active);
  }

  /** Adds a panel to the collection. */
  addPanel(panel: WebviewPanel): void {
    this.webviewPanels.push(panel);
  }

  /** Handles the disposal of a panel by removing it from the collection. */
  disposePanel(panel: WebviewPanel): void {
    pull(this.webviewPanels, panel);
  }
}

/** Singleton instance to work with in application code. */
export const panelManager = new PanelManager();

// Hack to expose the panels to the test framework.
// Static variables aren't available in CI for some reason.
(global as any).__test__ = { panelManager };
