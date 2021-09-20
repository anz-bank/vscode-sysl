import path from "path";
import glob from "glob";
import Mocha from "mocha";
import { getOrDownloadSysl } from "../tools/sysl_download";

const mocha = new Mocha({ ui: "tdd" });

const root = path.resolve(__dirname, "../..");
const testRoot = path.join(root, "out");

const testFiles = glob
  .sync("**/**.test.js", { cwd: testRoot })
  .filter((f) => !f.includes("test/ui/") && !f.includes("/renderer"));
testFiles.forEach((file) => mocha.addFile(path.join(testRoot, file)));
console.log(testFiles);

mocha.globalSetup(() => getOrDownloadSysl(root));
mocha.run();
