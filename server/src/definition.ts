import { Definition, IConnection, Location, TextDocumentPositionParams } from "vscode-languageserver";
import Uri from "vscode-uri";
import { SymbolType } from "./symbols";
import { ISourceContext, SymbolsProvider } from "./symbolsProvider";
// tslint:disable-next-line:no-var-requires
const SyslExtnParserErrorListener = require("./sysl/SyslExtnParserErrorListener").SyslExtnParserErrorListener;

export class DefinitionProvider  {
    // tslint:disable-next-line:member-access
    symbolsProvider: SymbolsProvider;
    private conn: IConnection;

    constructor(sym: SymbolsProvider, conn: IConnection) {
        this.symbolsProvider = sym;
        this.conn = conn;
    }

    public loadAST(uri: string): any {
        const listener = new SyslExtnParserErrorListener(this.conn);
        const ast =  this.symbolsProvider.loadAST(uri, listener);
        return ast;
    }

    public findSymbolUnderCaret(ast: any, row: number): any[] {
        const symbols: any[] = this.symbolsProvider.fileSymbols(ast);
        if (symbols[row] === undefined) { return []; }
        return symbols[row];
    }

    public toLocation(sc: ISourceContext): Location {
        const loc: Location = {
            range: {
                end: {
                    character: sc.start.col,
                    line: sc.start.line - 1,
                },
                start: {
                    character: sc.start.col,
                    line: sc.start.line - 1,
                },
            },
            uri:  Uri.file(sc.file).toString(),
        };
        return loc;
    }

    public onDefinition(param: TextDocumentPositionParams): Definition {
        const row = param.position.line + 1;
        const column = param.position.character;
        const ast = this.loadAST(param.textDocument.uri);
        const symbols = this.findSymbolUnderCaret(ast, row);
        let index: number;
        const symbol = symbols.filter((obj: any, i: number) => {
            const start = obj.start.column;
            const end = start + obj.name.length;
            const isUnderCursor = (column >= start && column <= end);
            if (isUnderCursor === true) {
              index = i;
            }
            return isUnderCursor;
        });
        if (symbol.length === 1) {
            const projectSymbols = this.symbolsProvider.loadSymbolsForFile(param.textDocument.uri);
            const symbolUnderCaret = symbol[0].name;
            let sc: ISourceContext;

            switch (symbol[0].type) {
                case SymbolType.Application:
                    sc = projectSymbols[symbolUnderCaret].sourceContext as ISourceContext;
                    break;
                case SymbolType.Endpoint:
                    {
                        const prev = symbols[index - 1].name;
                        const app = projectSymbols[prev];
                        if (app === undefined) { return null; }
                        const ep = app.endpoints[symbolUnderCaret];
                        sc = ep.sourceContext as ISourceContext;
                    }
                    break;
                // TODO: provide support for following types
                case SymbolType.Field:
                case SymbolType.Param:
                case SymbolType.Type:
                    {
                      Object.keys(projectSymbols).forEach((element) => {
                        if (projectSymbols.hasOwnProperty(element)) {
                          if ( projectSymbols[element].types !== null
                            && projectSymbols[element].types[symbolUnderCaret] !== null) {
                            sc = projectSymbols[element].types[symbolUnderCaret].sourceContext as ISourceContext;
                          }
                      }
                      });
                    }
                    break;
                case SymbolType.TypeRef:
                    {
                        const appName = symbols[index - 1].name;
                        const app = projectSymbols[appName];
                        if (app === undefined || app.types === undefined) {
                          return null;
                        }
                        sc = app.types[symbolUnderCaret].sourceContext as ISourceContext;
                    }
                    break;
            }
            return this.toLocation(sc);
        } else if (symbol.length > 1) {
            this.conn.console.warn("Multiple symbols under cursor?" +  symbol.length);
            this.conn.console.log(symbol.toString());
        }
        return null;
    }
}
