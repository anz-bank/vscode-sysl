import path from "path";
import { URI } from "vscode-uri";

/** The type of an event indicating that it's a diagram snapshot. */
export const snapshotEventType = "diagramSnapshot";

/** Event for a snapshot taken in the renderer. */
export interface SnapshotEvent {
  type: typeof snapshotEventType;
  name?: string;
  data: string;
}

/** Output path and content of a snapshot to save. */
export type Snapshot = {
  path: URI;
  data: Buffer;
};

/** Transforms a snapshot event into the data needed to save the snapshot. */
export function parseSnapshotEvent(event: SnapshotEvent, modelUri: URI): Snapshot {
  let suffix = new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
  if (event.name) {
    suffix = `${event.name.toLowerCase().replace(/\s/g, "_")}-${suffix}`;
  }
  const filename = `${path.parse(modelUri.fsPath).name}-${suffix}.svg`;
  const filepath = path.normalize(path.resolve(modelUri.fsPath, `../${filename}`));

  return {
    path: URI.file(filepath),
    data: Buffer.from(event.data),
  };
}
