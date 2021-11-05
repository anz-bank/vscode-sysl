import path from "path";
import { Uri, workspace } from "vscode";

export class FileLogger {
  constructor(private readonly logDir: string) {}

  log(id: string, kind: string, ...message: string[]) {
    workspace.fs.writeFile(
      Uri.file(path.join(this.logDir, `${kind}-${id}.json`)),
      Buffer.from(message.join("\n"))
    );
  }
}
