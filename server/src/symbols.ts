import child_process = require("child_process");
import fs = require("fs");
import path = require("path");
import { IConnection } from "vscode-languageserver";
import Uri from "vscode-uri";
// tslint:disable-next-line:no-var-requires
import { ISettings, ISyslConfigChangeListener, SyslConfigProvider  } from "./config";
// tslint:disable-next-line:no-var-requires
const sysl = require("sysljs");
// tslint:disable-next-line:no-var-requires
const SyslParser = sysl.SyslParser;

export enum SymbolType {
    Application = 1,
    Endpoint,
    View,
    Field,
    Param,
    Type,
    TypeRef,
}

export interface ISourceLocation {
    line: number;
    col: number;
}

export interface ISourceContext {
    file: string;
    start: ISourceLocation;
}

const parserToSymbolType = Object.create(null);

parserToSymbolType[SyslParser.RULE_application] = SymbolType.Application;
parserToSymbolType[SyslParser.RULE_endpoint_name] = SymbolType.Endpoint;
parserToSymbolType[SyslParser.RULE_field] = SymbolType.Param;
parserToSymbolType[SyslParser.RULE_field_type] = SymbolType.Field;
parserToSymbolType[SyslParser.RULE_method_def] = SymbolType.Endpoint;
parserToSymbolType[SyslParser.RULE_reference] = SymbolType.TypeRef; // combo of type.field
parserToSymbolType[SyslParser.RULE_target] = SymbolType.Application;
parserToSymbolType[SyslParser.RULE_target_endpoint] = SymbolType.Endpoint;
parserToSymbolType[SyslParser.RULE_table] = SymbolType.Type;
parserToSymbolType[SyslParser.RULE_types] = SymbolType.Type;
parserToSymbolType[SyslParser.RULE_view] = SymbolType.View;

export class SymbolsProvider implements ISyslConfigChangeListener {
    private settings: ISettings;
    private tempFolder: string;
    private conn: IConnection;

    constructor(config: SyslConfigProvider, conn: IConnection) {
      config.register(this);
      this.conn = conn;
    }

    public onChange(settings: ISettings) {
      this.settings = settings;
      this.tempFolder = settings.sysl.workspace.root + "/.sysl-tmp/";
      if (fs.existsSync(this.tempFolder) === false) {
        fs.mkdirSync(this.tempFolder);
      }
    }

    public loadAST(uri: string, listener: any): any {
      const fileName = Uri.parse(uri).fsPath;
      const input = fs.readFileSync(fileName, "utf8");
      return this.parse(input, listener);
    }

    public fileSymbols(tree: any): any[] {
      const syms = this.allSymbols(tree, undefined);
      const symbols: any[] = [];
      syms.forEach((obj) => {
        if (symbols[obj.start.line] === undefined) {
          symbols[obj.start.line] = [];
        }
        symbols[obj.start.line].push(obj);
      });
      return symbols;
    }

    public allSymbols(tree: any, parent: number): any[] {
      if (tree === undefined || tree.ruleIndex === undefined) { return []; }

      let symbols: any[] = [];
      switch (tree.ruleIndex) {
        case SyslParser.RULE_user_defined_type:
        case SyslParser.RULE_app_name:
          {
            const appSymbol = {
              end: tree.stop,
              name: tree.getText(),
              start: tree.start,
              type: SymbolType.Application,
              };
            symbols.push(appSymbol);
            return symbols;
          }
        case SyslParser.RULE_name_str:
          const symbol = {
            end: tree.stop,
            name: tree.getText(),
            start: tree.start,
            type: parserToSymbolType[parent],
          };
          symbols.push(symbol);
          return symbols;
        case SyslParser.RULE_reference:
        case SyslParser.RULE_application:
        case SyslParser.RULE_endpoint_name:
        case SyslParser.RULE_field:
        case SyslParser.RULE_field_type:
        case SyslParser.RULE_method_def:
        case SyslParser.RULE_target:
        case SyslParser.RULE_target_endpoint:
        case SyslParser.RULE_table:
        case SyslParser.RULE_view:
        case SyslParser.RULE_types:
        case SyslParser.RULE_expr_func:
          parent = tree.ruleIndex;
          break;
        case SyslParser.RULE_imports_decl:
          return symbols;
        case SyslParser.RULE_sysl_file:
          break;
        case undefined:
          return symbols;
      }
      if (tree.children == null) {
        return symbols;
      }
      for (const rule of tree.children) {
        if (rule.children == null) {
          continue;
        }
        const childSyms = this.allSymbols(rule, parent);
        symbols = symbols.concat(childSyms);
      }

      return symbols;
    }

    public parse(text: string, listener: any): any {
      return sysl.SyslParse(text, listener);
    }

    public getRoot(): string {
      return this.settings.sysl.workspace.root;
    }

    public getTempLocation(): string {
      return this.tempFolder;
    }

    public getModuleNameFromRoot(root: string, filename: string) {
      const end = filename.indexOf(root, 0);
      const modulePath = filename.substring(end + root.length);
      return modulePath;
    }

    public docUriToTempFile(uri: string): string {
      const filename = Uri.parse(uri).fsPath;
      const jsonFile = path.basename(filename) + ".json";
      return this.getTempLocation() + jsonFile;
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

      const filename = Uri.parse(uri).fsPath;
      const tempOutputFile = this.docUriToTempFile(uri);
      const args = [
        "--root",
        this.getRoot(),
        "-o",
        tempOutputFile,
        this.getModuleNameFromRoot(this.getRoot(), filename),
      ];

      this.conn.console.log(args.toString());
      const parser = child_process.spawn(parserPath, args);
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
