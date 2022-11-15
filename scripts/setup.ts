import path from "path";
import { SyslDownloader } from "../packages/extension/src/tools/sysl_download";

const root = path.resolve(__dirname, "..");

export default async () => new SyslDownloader().getOrDownloadSysl(root);
