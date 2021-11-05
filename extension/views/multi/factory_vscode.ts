import { last } from "lodash";
import { commands, ViewColumn } from "vscode";
import { URI } from "vscode-uri";
import { multiviewType, MultiViewFactory } from ".";
import { views } from "..";
import { MultiView } from "./types";

export class CustomEditorMultiViewFactory implements MultiViewFactory {
  async create(docUri: URI): Promise<MultiView> {
    commands.executeCommand("vscode.openWith", docUri, multiviewType, ViewColumn.Beside);
    return await new Promise((resolve) =>
      setTimeout(() => {
        // TODO: Replace with more robust callback.
        resolve(last(views.getMultiViews(docUri))!);
      }, 1000)
    );
  }
}
