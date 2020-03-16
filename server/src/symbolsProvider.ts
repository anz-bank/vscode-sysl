import child_process = require("child_process");
import fs = require("fs");
import path = require("path");
import { IConnection } from "vscode-languageserver";
import { URI } from "vscode-uri";
// tslint:disable-next-line:no-var-requires
import { ISettings, ISyslConfigChangeListener, SyslConfigProvider  } from "./config";
import {SyslSymbols} from "./symbols";

export interface ISourceLocation {
    line: number;
    col: number;
}

export interface ISourceContext {
    file: string;
    start: ISourceLocation;
}

export class SymbolsProvider extends SyslSymbols implements ISyslConfigChangeListener {
    private settings: ISettings;
    private tempFolder: string;
    private conn: IConnection;

    constructor(config: SyslConfigProvider, conn: IConnection) {
      super();
      config.register(this);
      this.conn = conn;
    }

    public onChange(settings: ISettings) {
      this.settings = settings;
      this.tempFolder = path.join(settings.sysl.workspace.root, ".sysl-tmp");
      if (fs.existsSync(this.tempFolder) === false) {
        fs.mkdirSync(this.tempFolder);
      }
    }

    public getRoot(): string {
      return this.settings.sysl.workspace.root;
    }

    public getTempLocation(): string {
      return this.tempFolder;
    }

    public getModuleNameFromRoot(root: string, filename: string) {
      const end = filename.indexOf(root, 0);
      const filePath = filename.substring(end + root.length);
      return URI.file(filePath).path;
    }

    public docUriToTempFile(uri: string): string {
      const filename = URI.parse(uri).fsPath;
      const jsonFile = path.basename(filename) + ".json";
      return path.join(this.getTempLocation(), jsonFile);
    }

    public loadSymbolsForFile(uri: string) {
      const obj = JSON.parse(fs.readFileSync(this.docUriToTempFile(uri), "utf8"));
      return obj.apps;
    }

    public parseSyslInput(uri: string): void {
      const parserPath = this.settings.sysl.tool.parser;

      if (parserPath === "" || fs.existsSync(parserPath) === false) {
        this.conn.console.warn("go-sysl tool path is empty or the tool does not exists!");
        this.conn.console.warn("Use SYSL: Select Go-Sysl tool command to set the path.");
        return;
      }

      const filename = URI.parse(uri).fsPath;
      const tempOutputFile = this.docUriToTempFile(uri);
      const args = [
        "-mode", "json",
        "--root",
        this.getRoot(),
        "-o",
        tempOutputFile,
        "-log", "debug",
        this.getModuleNameFromRoot(this.getRoot(), filename),
      ];

      this.conn.console.log(args.toString());
      const parser = child_process.spawn(parserPath, args);
      parser.stderr.on("data", (data) => {
        this.conn.console.log(`${data}`);
      });
      parser.on("exit", (code: number) => {
        // TODO: push diagnostics, warn about changing root
        if (code === 1) {
          this.conn.console.error(parserPath + " exited with " + code);
          this.conn.console.error("Check your SYSL root!");
          this.conn.console.error("Use Sysl: Select Root command to set the root path.");
        } else {
            this.conn.console.log(parserPath + " exited with " + code);
        }
      });
    }
}
