import { URI } from "vscode-uri";
import { MultiView } from "./types";

export const multiviewType = "sysl.multiView";

export interface MultiViewFactory {
  create(docUri: URI): Promise<MultiView>;
}
