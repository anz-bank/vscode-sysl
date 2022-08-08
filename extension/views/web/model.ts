import { ViewModel, ViewModelDelta } from "@anz-bank/vscode-sysl-plugin";

/** Models the content of a web page. */
export interface WebModel extends ViewModel {
  content: string;
}

/** Models a change to the content of a web page. */
export interface WebModelDelta extends ViewModelDelta {
  content: string;
}
