import path from "path";
import glob from "glob";
import Mocha from "mocha";
import { getOrDownloadSysl } from "../tools/sysl_download";

const mocha = new Mocha({ ui: "tdd" });

const root = path.resolve(__dirname, "../../extension");

const testFiles = glob.sync("**/**.test.ts", { cwd: root }).filter((f) => !f.includes("test/ui/"));
testFiles.forEach((file) => mocha.addFile(path.join(root, file)));

mocha.globalSetup(() => getOrDownloadSysl(root));
mocha.run();
