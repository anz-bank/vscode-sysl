import { URI } from "vscode-uri";
import { MultiView } from "./types";

export const multiviewType = {
  sysl: "sysl.multiView",
  sysld: "sysld.multiView",
};

export interface MultiViewFactory {
  create(docUri: URI): Promise<MultiView>;
}
