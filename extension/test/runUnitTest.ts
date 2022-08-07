require("ts-mocha");
import path from "path";
import glob from "glob";
const Mocha = require("mocha");
// import Mocha from "ts-mocha";
import { getOrDownloadSysl } from "../tools/sysl_download";

const mocha = new Mocha({ ui: "tdd" });

const root = path.resolve(__dirname, "../..");
const testRoot = path.join(root, "extension");

const testFiles = glob
  .sync("**/**.test.ts", { cwd: testRoot })
  .filter((f) => !f.includes("test/ui/") && !f.includes("/renderer"));
testFiles.forEach((file) => mocha.addFile(path.join(testRoot, file)));
console.log(testFiles);

getOrDownloadSysl(root).then(() => mocha.run());
