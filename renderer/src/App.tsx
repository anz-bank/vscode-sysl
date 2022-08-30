import { uriToViewKey } from "@anz-bank/vscode-sysl-model";
import { Snackbar } from "@material-ui/core";
import { TabContext } from "@material-ui/lab";
import MuiAlert, { AlertProps } from "@material-ui/lab/Alert";
import { withStyles } from "@material-ui/styles";
import * as go from "gojs";
import { produce } from "immer";
import { at, each, intersection, isEmpty, keyBy, pick, sortBy } from "lodash";
import * as React from "react";
import { URI } from "vscode-uri";
import { GoJSIndex, shouldNotifyChange, updateState } from "./components/diagram/DiagramState";
import { DiagramData, Edge, Node } from "./components/diagram/DiagramTypes";
import { HtmlModel } from "./components/html/HtmlModel";
import { TabLabelType } from "./components/layout/LayoutTypes";
import LayoutWrapper from "./components/layout/LayoutWrapper";
import MainContainer from "./components/layout/MainContainer";
import { tabLabelIcon } from "./components/layout/TopBar";
import { Change, TableModel } from "./components/table/TableModel";
import {
  stringToViewKey,
  ViewItem,
  ViewKey,
  viewKeyToString,
  ViewModel,
} from "./components/views/types";
import { vscode } from "./components/vscode/VsCode";

type AppState = {
  viewData: {
    diagrams: { [key: string]: DiagramData };
    htmlDocs: { [key: string]: HtmlModel };
    tables: { [key: string]: TableModel };
  };
  selectedData: { [key: string]: DiagramData | null };
  activeChild: string;
  error?: {
    openSnackBar: boolean;
    errorMessage: string | null;
  };
};

const initialState: AppState = {
  activeChild: "",
  selectedData: {},
  viewData: {
    diagrams: {},
    htmlDocs: {},
    tables: {},
  },
  error: {
    openSnackBar: false,
    errorMessage: null,
  },
};

interface StyleObject {
  [key: string]: any;
}

const styles: StyleObject = () => ({
  root: {
    flexGrow: 1,
    display: "flex",
    maxWidth: "100vw",
  },
  alert: {
    whiteSpace: "pre-wrap",
  },
  tabPanel: {
    padding: 10,
    flexGrow: 1,
  },
});

interface AppProps {
  classes: any;
}

type ParentMessageEvent = {
  data: {
    type: string;
    model: (DiagramData | HtmlModel | any) & {
      meta?: {
        key: string;
        kind: string;
        label?: string;
        lastUpdated?: string;
      };
    };
    error?: { [key: string]: any };
  };
};

type SelectionMessageEvent = {
  type: string;
  selectedData: {
    current: DiagramData | null;
    previous: DiagramData | null;
  };
  error?: { [key: string]: any };
};

type VisibilityMessageEvent = {
  type: string;
  previous: Node[];
  current: Node[];
};

function Alert(props: AlertProps) {
  return <MuiAlert elevation={6} {...props} />;
}

function isDiagramData(model: any): model is DiagramData {
  const hasNodesOrEdges = (obj: any) => "nodes" in obj && obj.nodes;
  return hasNodesOrEdges(model);
}

function isHtmlModel(model: any): model is HtmlModel {
  const hasContent = (obj: any) => "content" in obj;
  return hasContent(model);
}

function isTableModel(model: any): model is TableModel {
  return "data" in model;
}

/**
 * Returns the associated DiagramData for a list of GoJS Parts.
 */
function getDiagramData(data: go.Part[], diagram: DiagramData): DiagramData | null {
  let nodes: string[] = [];
  let edges: string[] = [];

  data.forEach((obj: go.ObjectData) => {
    if (obj instanceof go.Node) {
      obj.key && nodes.push(obj.key.toString());
    } else if (obj instanceof go.Link) {
      obj.key && edges.push(obj.key.toString());
    }
  });

  const diagramData: DiagramData = {
    nodes: at(keyBy(diagram.nodes, "key"), nodes),
    edges: at(keyBy(diagram.edges, "key"), edges),
  };

  return diagramData;
}

class App extends React.PureComponent<AppProps, AppState> {
  private gojsIndexes: { [key: string]: GoJSIndex } = {};

  constructor(props: AppProps) {
    super(props);

    this.state = vscode.getState() || initialState;
    each(this.state.viewData.diagrams, ({ nodes, edges }, k) => {
      this.gojsIndexes[k] = new GoJSIndex({ nodes, edges });
    });

    // bind handler methods
    this.handleDiagramEvent = this.handleDiagramEvent.bind(this);
    this.handleModelChange = this.handleModelChange.bind(this);
    this.handleTableModelChange = this.handleTableModelChange.bind(this);
    this.handleParentMessage = this.handleParentMessage.bind(this);
    this.handleTabChange = this.handleTabChange.bind(this);
    this.handleCloseError = this.handleCloseError.bind(this);
    this.setSelectedData = this.setSelectedData.bind(this);
    this.setVisibility = this.setVisibility.bind(this);
  }

  public componentDidMount() {
    window.addEventListener("message", this.handleParentMessage);

    // Notify the parent that a view was present at mounting time (e.g. loaded from previous state).
    this.forEachView(({ key, model }) => vscode.postMessage({ type: "view/didOpen", key, model }));
  }

  public componentWillUnmount() {
    window.removeEventListener("message", this.handleParentMessage);
  }

  /**
   * Sets state from selection(s) in Diagram or Component Tree.
   */
  public setSelectedData(selection: DiagramData | null): void {
    const selectedEdges: Edge[] = [];
    selection?.edges?.forEach((edge: Edge) => {
      // select all edges in a link group
      if (!isEmpty(edge.groups)) {
        const edgesInGroup: Edge[] = this.state.viewData.diagrams[
          this.state.activeChild
        ].edges.filter((e) => intersection(e.groups, edge.groups).length > 0);
        selectedEdges.push(...edgesInGroup);
      } else {
        selectedEdges.push(edge);
      }
    });
    this.setState(
      produce((draft: AppState) => {
        draft.selectedData[draft.activeChild] = selection
          ? { ...selection, edges: selectedEdges }
          : null;
      }),
      () => {
        vscode.setState(this.state);
      }
    );
  }

  /**
   * Sets individual node's visibility in the component tree.
   * @param node The diagram node to set visibility on.
   */
  public setVisibility(node: Node): void {
    const nextState = produce(this.state, (draft: AppState) => {
      const diagram = draft.viewData.diagrams[draft.activeChild];
      const targetNode = diagram.nodes.find((n) => n.key === node.key);
      // A node's visible property defaults to undefined and is designed to be visible
      if (targetNode) targetNode.visible = !(targetNode.visible ?? true);
      return draft;
    });

    const message: VisibilityMessageEvent = {
      type: "view/visibilityChanged",
      previous: this.state.viewData.diagrams[this.state.activeChild].nodes ?? [],
      current: nextState.viewData?.diagrams[nextState.activeChild].nodes ?? [],
    };
    vscode.postMessage(message);

    this.setState(nextState, () => {
      vscode.setState(this.state);
    });
  }

  /**
   * Updates state to show error in snackbar.
   * @param error received from extension
   */
  public showError(error: { [key: string]: any }, action?: string, kind?: string) {
    let errorText = "";
    switch (action) {
      case "render":
        errorText = `The ${
          kind ?? ""
        } view could not be rendered because the following error occurred:\n\n`;
        break;
      default:
        errorText = `The following error occurred:\n\n`;
    }
    if (error.errorId) {
      errorText = errorText.concat(error.errorId.toString() + ": ");
    }
    errorText = errorText.concat(error.errorMsg);

    this.setState({ error: { openSnackBar: true, errorMessage: errorText } }, () => {
      vscode.setState(this.state);
    });
  }

  /**
   * Handles close event of error snackbar.
   */
  public handleCloseError(event?: React.SyntheticEvent, reason?: string) {
    if (reason === "clickaway") {
      return;
    }
    this.setState({ error: { openSnackBar: false, errorMessage: null } }, () => {
      vscode.setState(this.state);
    });
  }

  /**
   * Handle messages sent from the extension to the webview.
   */
  public handleParentMessage(event: ParentMessageEvent) {
    console.log("[App > handleParentMessage] event", event.data);
    const { type, model, error } = event.data;
    const meta = model?.meta ?? {};
    if (error) {
      this.showError(error, type, meta.kind);
      return;
    }
    try {
      switch (type) {
        case "render":
          model.label = meta.label;
          const keyString = viewKeyToString(meta.key);

          if (meta.kind === "diagram") {
            if (!isDiagramData(model)) {
              const errorMsg = "data object is missing nodes";
              this.showError({ errorMsg }, type, meta.kind);
            } else {
              this.setState(
                produce((draft: AppState) => {
                  draft.error = { openSnackBar: false, errorMessage: null };
                  const nodes = model.nodes;
                  draft.viewData.diagrams[keyString] = {
                    ...model,
                    nodes,
                    resetsDiagram: true,
                  };
                  Object.entries(draft.viewData.diagrams).forEach(
                    ([k, { nodes, edges }]) =>
                      (this.gojsIndexes[k] = new GoJSIndex({ nodes, edges }))
                  );
                  if (!draft.activeChild) {
                    draft.activeChild = keyString;
                  }
                }),
                () => {
                  vscode.setState(this.state);
                  vscode.postMessage({
                    type: "view/didOpen",
                    key: meta.key,
                    model,
                  });
                }
              );
            }
          } else if (meta.kind === "table") {
            if (!isTableModel(model)) {
              const errorMsg = "data object is missing rows";
              this.showError({ errorMsg }, type, meta.kind);
            } else {
              this.setState(
                produce((draft: AppState) => {
                  draft.error = { openSnackBar: false, errorMessage: null };
                  draft.viewData.tables[keyString] = { ...model };
                  if (!draft.activeChild) {
                    draft.activeChild = keyString;
                  }
                }),
                () => {
                  vscode.setState(this.state);
                  vscode.postMessage({
                    type: "view/didOpen",
                    key: meta.key,
                    model,
                  });
                }
              );
            }
          } else {
            if (!isHtmlModel(model)) {
              this.showError({ errorMsg: "data object is missing content" }, type, meta.kind);
            } else {
              this.setState(
                produce((draft: AppState) => {
                  draft.error = { openSnackBar: false, errorMessage: null };
                  draft.viewData.htmlDocs[keyString] = model;
                  if (!draft.activeChild) {
                    draft.activeChild = keyString;
                  }
                }),
                () => {
                  vscode.setState(this.state);
                  vscode.postMessage({
                    type: "view/didOpen",
                    key: meta.key,
                    model,
                  });
                }
              );
            }
          }
          break;
        case "update":
          if (meta.kind === "diagram") {
            if (!isDiagramData(model)) {
              const errorMsg = "data object is missing nodes and/or edges";
              this.showError({ errorMsg }, type, meta.kind);
            } else {
              console.log("no errors, need to update diagram model now");
            }
            if (meta.kind === "table") {
              if (!isTableModel(model)) {
                const errorMsg = "data object is missing rows";
                this.showError({ errorMsg }, type, meta.kind);
              } else {
                console.log("no errors, need to update table model now");
              }
            } else {
              if (!model.content) {
                this.showError({ errorMsg: "data object is missing content" }, type, meta.kind);
              } else {
                console.log("no errors, need to update html now");
              }
            }
            break;
          }
      }
    } catch (e) {
      this.showError({ errorMsg: e }, type, meta.kind);
    }
  }

  /**
   * Handle any relevant DiagramEvents, in this case just selection changes.
   * On ChangedSelection, find the corresponding data and set the selectedData state.
   * @param e a GoJS DiagramEvent
   */
  public handleDiagramEvent(e: go.DiagramEvent) {
    switch (e.name) {
      case "ChangedSelection":
        const selection = getDiagramData(
          e.subject.toArray(),
          this.state.viewData.diagrams[this.state.activeChild]
        );
        const message: SelectionMessageEvent = {
          type: "select",
          selectedData: {
            current: selection,
            previous: this.state.selectedData[this.state.activeChild] ?? null,
          },
        };
        vscode.postMessage(message);
        this.setSelectedData(selection);
        break;
      default:
        break;
    }
  }

  /**
   * Handle GoJS model changes, which output an object of data changes via Model.toIncrementalData.
   * This method iterates over those changes and updates state to keep in sync with the GoJS model.
   * @param delta a JSON-formatted string
   */
  public handleModelChange(delta: go.IncrementalData) {
    const index = this.gojsIndexes[this.state.activeChild];
    const notify = shouldNotifyChange(index, delta);

    this.setState(
      produce((draft: AppState) => {
        updateState(index, draft.viewData.diagrams[draft.activeChild], delta);
      }),
      () => {
        vscode.setState(this.state);

        if (notify) {
          const data = this.state.viewData.diagrams[this.state.activeChild];
          vscode.postMessage({
            type: "view/didChange",
            key: stringToViewKey(this.state.activeChild),
            delta,
            model: pick(data, "nodes", "edges"),
            viewId: data.type?.id,
          });
        }
      }
    );
  }

  /**
   * Handle table model changes, which output an object of data changes.
   * This method iterates over those changes and updates state to keep in sync with the table model.
   * @param delta a JSON-formatted string
   */
  public handleTableModelChange(delta: Change[]) {
    const viewId = this.state.activeChild;
    const notify = true; // TODO: Determine if any change events are not user-initiated.

    this.setState(
      produce((draft: AppState) => {
        const model = draft.viewData.tables[viewId];
        delta.forEach(({ row, prop, newValue }) => {
          model.data[row][Number(prop)] = newValue;
        });
      }),
      () => {
        vscode.setState(this.state);
        if (notify) {
          vscode.postMessage({
            type: "view/didChange",
            key: stringToViewKey(viewId),
            delta,
          });
        }
      }
    );
  }

  /**
   * Handle changes to the active tab, updating the displayed diagram.
   * @param event The change event.
   * @param newValue The index of the new active tab as a string.
   */
  public handleTabChange(_: React.ChangeEvent<{}>, newValue: string) {
    vscode.postMessage({
      type: "view/didHide",
      key: uriToViewKey(URI.parse(this.state.activeChild)),
    });
    vscode.postMessage({
      type: "view/didShow",
      key: uriToViewKey(URI.parse(newValue)),
    });
    this.setState(
      produce((draft: AppState) => {
        draft.activeChild = newValue;
      })
    );
  }

  public render() {
    const { classes } = this.props;

    const errorMessage = (
      <>
        {this.state.error?.openSnackBar && (
          <Snackbar
            data-testid="error-snackbar"
            open={this.state.error.openSnackBar}
            onClose={this.handleCloseError}
          >
            <Alert
              classes={{ root: classes.alert }}
              onClose={this.handleCloseError}
              severity="error"
            >
              {this.state.error.errorMessage}
            </Alert>
          </Snackbar>
        )}
      </>
    );

    const getLabel = (model: ViewModel, defaultLabel: string) =>
      (isDiagramData(model) && model.templates?.diagramLabel) || model.meta?.label || defaultLabel;

    const getFlag = (model: ViewModel) => {
      if (isDiagramData(model) && model.type?.willRender) {
        return tabLabelIcon.loading;
      }
      return this.state.error?.openSnackBar ? tabLabelIcon.failed : tabLabelIcon.none;
    };

    let tabLabels: TabLabelType[] = [];
    this.forEachViewDataModel(({ key, model, index }) => {
      tabLabels.push({ key, label: getLabel(model, `View ${index}`), flag: getFlag(model) });
    });
    tabLabels = sortBy(tabLabels, "[1]");

    return (
      <TabContext value={this.state.activeChild.toString()}>
        <LayoutWrapper
          setVisibility={this.setVisibility}
          activeNodes={this.state.viewData.diagrams[this.state.activeChild]?.nodes}
          onSelectionChanged={this.setSelectedData}
          handleTabChange={this.handleTabChange}
          selectedData={this.state.selectedData[this.state.activeChild]}
          tabLabels={tabLabels}
        >
          <div className={classes.root}>
            {errorMessage}
            {
              <MainContainer
                selectedData={this.state.selectedData[this.state.activeChild]}
                classes={classes}
                data={this.state.viewData}
                activeChild={this.state.activeChild}
                handleDiagramEvent={this.handleDiagramEvent}
                handleModelChange={this.handleModelChange}
                handleTableModelChange={this.handleTableModelChange}
              />
            }
          </div>
        </LayoutWrapper>
      </TabContext>
    );
  }

  private forEachViewDataModel(
    f: (viewData: { key: string; model: ViewModel; index: number }) => void
  ) {
    this.forEachView(({ keyUri, model, index }) => f({ key: keyUri, model, index }));
  }

  // TODO: Replace the viewData map with something more iterable.
  private forEachView(
    f: (view: { key: ViewKey; keyUri: string; model: ViewModel; index: number }) => void
  ) {
    let i = 1;
    each(this.state.viewData, (v) => {
      each(v, (model, key) => f({ keyUri: key, key: stringToViewKey(key), model, index: i++ }));
    });
  }

  /** Returns an array of items describing the current views. */
  private getViewItems(): ViewItem[] {
    const items: ViewItem[] = [];
    this.forEachView(({ key, model }) => items.push({ key, model }));
    return items;
  }
}

export default withStyles(styles)(App);
