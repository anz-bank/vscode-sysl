import path from "path";
import Mocha from "mocha";
import glob from "glob";
import { ConfigurationTarget, workspace } from "vscode";
import { getOrDownloadSysl } from "../../tools/sysl_download";

export async function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: "tdd",
  });

  const root = path.resolve(__dirname, "../../..");
  const testsRoot = path.resolve(__dirname, ".");

  await ensureSysl(root);

  return new Promise((c, e) => {
    glob("**/**.test.js", { cwd: testsRoot }, (err, files) => {
      if (err) {
        return e(err);
      }

      // Add files to the test suite
      files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

      try {
        // Run the mocha test
        mocha.run((failures) => {
          if (failures > 0) {
            e(new Error(`${failures} tests failed.`));
          } else {
            c();
          }
        });
      } catch (err) {
        console.error(err);
        e(err);
      }
    });
  });
}

/** Ensures a discoverable Sysl binary exists. */
async function ensureSysl(rootDir: string): Promise<void> {
  const setSyslPathConfig = async (path: string) =>
    await workspace
      .getConfiguration()
      .update("sysl.tool.binaryPath", path, ConfigurationTarget.Global);

  await setSyslPathConfig("");
  const sysl = await getOrDownloadSysl(rootDir);
  await setSyslPathConfig(sysl.path);
}
