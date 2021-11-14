import path from "path";
import { Uri, window, workspace } from "vscode";
import { customEditorManager } from "./custom_editors";
import { parseSnapshotEvent, SnapshotEvent, Snapshotter } from "./snapshot";

export class WorkspaceSnapshotter implements Snapshotter {
  /**
   * Handles a snapshot event by writing the snapshot to disk and notifying the user of the path.
   * Returns the path.
   */
  async save(event: SnapshotEvent): Promise<Uri> {
    const ed = customEditorManager.activeCustomEditor;
    if (!ed) {
      throw new Error("no active editor to save snapshot for");
    }
    const snapshot = parseSnapshotEvent(event, ed.document.uri);
    await workspace.fs.writeFile(snapshot.path, snapshot.data);

    const snapshotDir = rootRelativePath(Uri.joinPath(snapshot.path, ".."));
    const info = `Snapshot saved to ${path.basename(snapshot.path.fsPath)} in ${snapshotDir}`;
    window.showInformationMessage(info);
    return snapshot.path;
  }
}

/**
 * Returns the path to uri relative to the workspace folder containing it.
 *
 * The relative path includes a leading {@code /} representing the workspace folder.
 *
 * If uri is not in the workspace, returns the full filesystem path.
 */
function rootRelativePath(uri: Uri): string {
  const wsFolder = workspace.getWorkspaceFolder(uri);
  if (wsFolder) {
    return path.join(wsFolder.name, uri.fsPath.slice(wsFolder.uri.fsPath.length));
  }
  return uri.fsPath;
}
