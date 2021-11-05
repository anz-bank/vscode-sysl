import download from "download";
import fs from "fs";
import got from "got";
import path from "path";
import { promisify } from "util";
import { coerce } from "semver";
import { Sysl } from "./sysl";
import { spawnBuffer } from "./spawn";

/** The minimum supported version of the Sysl binary. */
export const minVersion = "0.466.0";
/** The minimum supported version of the Sysl binary as a semantic version. */
export const minSemver = coerce(minVersion)!;

/**
 * Returns an instance of {@link Sysl} to perform Sysl operations (e.g. parsing).
 *
 * Looks for Sysl on the process environment's path and in {@link dir}. If an executable is not
 * found, the latest version of Sysl will be downloaded into {@link dir}.
 */
export async function getOrDownloadSysl(dir: string): Promise<Sysl> {
  try {
    return await localSysl(dir);
  } catch (e) {
    // Continue to attempt download.
    console.debug(e);
  }

  return await downloadSysl(dir);
}

/**
 * Returns a local instance of {@link Sysl} to perform Sysl operations (e.g. parsing).
 *
 * If no local copy of Sysl could be found, the promise will be rejected. Use
 * {@link getOrDownloadSysl} to also fetch a copy of Sysl if it's missing locally.
 *
 * @param dir Directory to check in addition and in precedence to the system path.
 */
export async function localSysl(dir: string): Promise<Sysl> {
  const extension = process.platform === "win32" ? ".exe" : "";
  const name = "sysl" + extension;

  try {
    return await checkSysl(path.join(dir, name));
  } catch (e) {
    try {
      return await checkSysl(name);
    } catch (e) {
      throw new Error("sysl not found locally");
    }
  }
}

/**
 * Attempts to invoke Sysl at the given path to check its existence.
 * Returns a {@link Sysl} instance if it can be invoked.
 */
export async function checkSysl(syslPath: string): Promise<Sysl> {
  try {
    await spawnBuffer(syslPath, ["info"]); // throws error if not found
    console.debug(`sysl found at ${syslPath}`);
    const sysl = new Sysl(syslPath);
    const semver = (await sysl.semver())!;
    if (semver.compare(minSemver) < 0) {
      throw new Error(`Sysl version ${semver} less then minimum version ${minSemver}`);
    }
    return sysl;
  } catch (e) {
    throw new Error(`sysl not available at ${syslPath}`);
  }
}

/** Downloads Sysl from https://github.com/anz-bank/sysl/releases. */
export async function downloadSysl(dir: string): Promise<Sysl> {
  const url = await getSyslDownloadUrl();
  console.log(`downloading sysl from ${url} into ${dir}...`);

  try {
    await promisify(fs.mkdir)(dir);
  } catch (e: any) {
    if (e.code === "EEXIST") {
      // Ignore error on mkdir for existing dir.
    }
  }
  const release = (await download(url, { extract: true })) as any[];
  const sysl = release.find((i) => i.path === "sysl" || i.path === "sysl.exe");
  console.log(`download complete: ${sysl.data.length / 1e6} MB`);

  const syslPath = path.join(dir, sysl.path);
  await promisify(fs.writeFile)(syslPath, sysl.data);
  await promisify(fs.chmod)(syslPath, "744");

  return new Sysl(syslPath);
}

/**
 * Returns the URL from which to download the best available version of Sysl.
 *
 * In general this will be the latest version, if the latest version can be discovered. If fetching
 * the URL for the latest version fails, it will fallback on a known-good version of Sysl.
 */
async function getSyslDownloadUrl(): Promise<string> {
  const platforms: { [key in NodeJS.Platform]?: string } = {
    darwin: "darwin-amd64",
    linux: "linux-amd64",
    win32: "windows-amd64",
  };
  const platform = platforms[process.platform];
  if (!platform) {
    throw new Error(`unknown platform ${process.platform}`);
  }

  type LatestData = { assets: { browser_download_url: string }[] };
  const latestApi = "https://api.github.com/repos/anz-bank/sysl/releases/latest";
  try {
    const latest = await got.get(latestApi).json<LatestData>();
    return latest.assets.map((a) => a.browser_download_url).find((u) => u.includes(platform))!;
  } catch (e) {
    // Request to GitHub API for latest URL may fail for avoidable reasons, e.g. rate limiting.
    // Fall back on known-good version for now.
    const version = minVersion;
    const format = process.platform === "win32" ? "zip" : "tar.gz";
    const url = `https://github.com/anz-bank/sysl/releases/download/v${version}/sysl_${version}_${platform}.${format}`;
    console.log("failed to get latest Sysl download URL, falling back to", url, "\nCause:", e);
    return url;
  }
}

/** Error messages relating to Sysl downloading and availability. */
export const errorMessage = {
  syslUnavailable: `Unable to locate or download Sysl binary (requires v${minSemver.version} or higher).`,
};
