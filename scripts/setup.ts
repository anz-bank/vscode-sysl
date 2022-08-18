import path from "path";
import { getOrDownloadSysl } from "../extension/tools/sysl_download";

const root = path.resolve(__dirname, "..");

export default async () => getOrDownloadSysl(root);
