import { IConnection } from "vscode-languageserver";
// tslint:disable-next-line:no-var-requires
const antlr4 = require("antlr4");
function SyslExtnParserErrorListener(conn: IConnection) {
    this.errors = [];
    this.conn = conn;
}

SyslExtnParserErrorListener.prototype = Object.create(antlr4.error.ErrorListener);
SyslExtnParserErrorListener.prototype.constructor = SyslExtnParserErrorListener;

function syntaxError(_1: any, _2: any, line: number, column: number, msg: string) {
    const error = {
        column: column + 1,
        line: line - 1,
        msg,
    };
    this.errors.push(error);
    this.conn.console.log("syntaxError: " + msg);
}

// tslint:disable
function reportAmbiguity(_recognizer: any, _dfa : any, _startIndex: number,
                         _stopIndex: number, _exact: any, _ambigAlts: any, _configs: any) {
                           this.conn.console.log("reportAmbiguity");
}

function reportAttemptingFullContext(_recognizer: any, _dfa : any, _startIndex: number, _stopIndex: number, _conflictingAlts: any, _configs: any) {
  this.conn.console.log("reportAttemptingFullContext");
}

function reportContextSensitivity(_recognizer: any, _dfa : any, _startIndex: number, _stopIndex: number, _prediction: any, _configs: any) {
  this.conn.console.log("reportContextSensitivity");
}

SyslExtnParserErrorListener.prototype.syntaxError = syntaxError;
SyslExtnParserErrorListener.prototype.reportAmbiguity = reportAmbiguity;
SyslExtnParserErrorListener.prototype.reportAttemptingFullContext = reportAttemptingFullContext;
SyslExtnParserErrorListener.prototype.reportContextSensitivity = reportContextSensitivity;
exports.SyslExtnParserErrorListener = SyslExtnParserErrorListener;
