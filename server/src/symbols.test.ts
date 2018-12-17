// tslint:disable-next-line:no-var-requires
const SyslParserErrorListener = require("sysljs/SyslParserErrorListener").SyslParserErrorListener;
import { SymbolType, SyslSymbols } from "./symbols";

describe("parse", () => {

  test("load model file", () => {
    const symbols = new SyslSymbols();
    const listener = new SyslParserErrorListener();
    const tree = symbols.loadAST("src/tests/model.sysl", listener);

    expect(listener.hasErrors).toBeFalsy();
    expect(tree.children).toBeTruthy();

    const s = symbols.fileSymbols(tree);

    expect(s.length).toBeGreaterThan(1);
    expect(s[1].length).toBe(1);
    expect(s[2].length).toBe(1);
    expect(s[3].length).toBe(1);
    expect(s[5].length).toBe(1);
    expect(s[6].length).toBe(2);
    expect(s[6][0].name).toBe("foo");
    expect(s[6][0].type).toBe(SymbolType.Param);
    expect(s[6][1].name).toBe("Foo");
    expect(s[6][1].type).toBe(SymbolType.Type);
  });

  test("load view file", () => {
    const symbols = new SyslSymbols();
    const listener = new SyslParserErrorListener();
    const tree = symbols.loadAST("src/tests/view.sysl", listener);

    expect(listener.hasErrors).toBeFalsy();
    expect(tree.children).toBeTruthy();

    const s = symbols.fileSymbols(tree);

    expect(s.length).toBeGreaterThan(1);
    expect(s[1].length).toBe(1);
    expect(s[2].length).toBe(4);
    expect(s[2][0].name).toBe("Foo");
    expect(s[2][0].type).toBe(SymbolType.View);
    expect(s[2][1].name).toBe("p2");
    expect(s[2][1].type).toBe(SymbolType.Param);
  });

  test("load call file", () => {
    const symbols = new SyslSymbols();
    const listener = new SyslParserErrorListener();
    const tree = symbols.loadAST("src/tests/call.sysl", listener);

    expect(listener.hasErrors).toBeFalsy();
    expect(tree.children).toBeTruthy();

    const s = symbols.fileSymbols(tree);

    expect(s.length).toBeGreaterThan(1);
    expect(s[6].length).toBe(2);
    expect(s[6][0].name).toBe("Foo :: Server");
    expect(s[6][0].type).toBe(SymbolType.Application);
    expect(s[6][1].name).toBe("Server Endpoint");
    expect(s[6][1].type).toBe(SymbolType.Endpoint);
  });
});
