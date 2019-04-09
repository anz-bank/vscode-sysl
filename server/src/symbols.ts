import fs = require("fs");
import Uri from "vscode-uri";
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
    FuncCall,
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
parserToSymbolType[SyslParser.RULE_user_defined_type] = SymbolType.Type;
parserToSymbolType[SyslParser.RULE_types] = SymbolType.Type;
parserToSymbolType[SyslParser.RULE_view] = SymbolType.View;
parserToSymbolType[SyslParser.RULE_view_param] = SymbolType.Param;
parserToSymbolType[SyslParser.RULE_expr_func] = SymbolType.FuncCall;

export class SyslSymbols {

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
        case SyslParser.RULE_app_name: {
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
        case SyslParser.RULE_view_param:
        case SyslParser.RULE_types:
        case SyslParser.RULE_user_defined_type:
          parent = tree.ruleIndex;
          break;
        case SyslParser.RULE_expr_func:
          const funcName = {
            end: tree.stop,
            name: tree.start.text,
            start: tree.start,
            type: parserToSymbolType[SyslParser.RULE_expr_func],
          };
          symbols.push(funcName);
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
}
