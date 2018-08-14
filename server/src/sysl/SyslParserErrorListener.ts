// tslint:disable-next-line:no-var-requires
const antlr4 = require("antlr4");

function SyslParserErrorListener() {
    this.errors = [];
}

SyslParserErrorListener.prototype = Object.create(antlr4.error.ErrorListener);
SyslParserErrorListener.prototype.constructor = SyslParserErrorListener;

function syntaxError(_1: any, _2: any, line: number, column: number, msg: string) {
    const error = {
        column: column + 1,
        line: line - 1,
        msg,
    };
    this.errors.push(error);
}

SyslParserErrorListener.prototype.syntaxError = syntaxError;
exports.SyslParserErrorListener = SyslParserErrorListener;
