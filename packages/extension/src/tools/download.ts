import archiveType from "archive-type";
import decompress from "decompress";
import * as fs from "fs/promises";
import got, { Options, Response } from "got";
import path from "path";

export async function downloadSysl(
  uri: string,
  strictSsl: boolean = true
): Promise<decompress.File[]> {
  const opts: Options = {
    https: { rejectUnauthorized: strictSsl },
  };

  try {
    const response = (await got(uri, opts)) as Response;
    if (!archiveType(response.rawBody)) {
      throw new Error("Downloaded sysl is not archive");
    }
    return decompress(response.rawBody);
  } catch (e) {
    throw new Error(`Failed to download sysl: ${e}`);
  }
}

export async function downloadPlugin(
  uri: string,
  dir: string,
  strictSsl: boolean = true
): Promise<decompress.File[]> {
  strictSsl = false; // TODO: Remove this like to enable strict SSL when supported.

  const opts: Options = {
    https: { rejectUnauthorized: strictSsl },
    // Timeouts and retries can be generous since this fetch doesn't block the user.
    timeout: { request: 10000 },
    retry: { limit: 5 },
  };

  const response = (await got(uri, opts)) as Response;
  if (response.statusCode >= 400) {
    throw new Error(`Failed to download plugin: ${response.statusCode}`);
  }
  if (!archiveType(response.rawBody)) {
    throw new Error("Downloaded plugin is not archive");
  }
  let files: decompress.File[];
  try {
    files = await decompress(response.rawBody);
  } catch (err) {
    throw new Error(`Failed to decompress plugin: ${err}`);
  }

  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    throw new Error(`Failed to create plugin download dir ${dir}: ${err}`);
  }
  try {
    await Promise.all(
      files
        .filter((f) => f.type === "file")
        .map(async (f) => {
          const filepath = path.join(dir, f.path);
          await fs.mkdir(path.dirname(filepath), { recursive: true });
          return fs.writeFile(filepath, f.data);
        })
    );
  } catch (err) {
    throw new Error(`Failed to write plugin files: ${err}`);
  }
  return files;
}
