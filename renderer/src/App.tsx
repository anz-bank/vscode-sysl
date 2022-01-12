import * as React from "react";
import * as go from "gojs";
import _, { sortBy, pick } from "lodash";
import { produce } from "immer";

import { withStyles } from "@material-ui/styles";
import { TabContext } from "@material-ui/lab";
import { Snackbar } from "@material-ui/core";
import MuiAlert, { AlertProps } from "@material-ui/lab/Alert";

import { vscode } from "./components/vscode/VsCode";
import { DiagramData, Edge } from "./components/diagram/DiagramTypes";
import { GoJSIndex, shouldNotifyChange, updateState } from "./components/diagram/DiagramState";

import LayoutWrapper from "./components/layout/LayoutWrapper";
import MainContainer from "./components/layout/MainContainer";
import { HtmlModel } from "./components/html/HtmlModel";
import {
  stringToViewKey,
  ViewItem,
  ViewKey,
  viewKeyToString,
  ViewModel,
} from "./components/views/types";
import { TabLabelType } from "./components/layout/LayoutTypes";

type AppState = {
  viewData: {
    diagrams: { [key: string]: DiagramData };
    htmlDocs: { [key: string]: HtmlModel };
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

function Alert(props: AlertProps) {
  return <MuiAlert elevation={6} {...props} />;
}

function isDiagramData(model: any) {
  const hasNodesOrEdges = (obj: any) => "nodes" in obj || "edges" in obj;
  return hasNodesOrEdges(model);
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
    nodes: _(diagram.nodes).keyBy("key").at(nodes).value(),
    edges: _(diagram.edges).keyBy("key").at(edges).value(),
    type: diagram.type,
  };

  return diagramData;
}

class App extends React.PureComponent<AppProps, AppState> {
  private gojsIndexes: { [key: string]: GoJSIndex } = {};

  constructor(props: AppProps) {
    super(props);

    this.state = vscode.getState() || initialState;
    _.each(this.state.viewData.diagrams, ({ nodes, edges }, k) => {
      this.gojsIndexes[k] = new GoJSIndex({ nodes, edges });
    });

    // bind handler methods
    this.handleDiagramEvent = this.handleDiagramEvent.bind(this);
    this.handleModelChange = this.handleModelChange.bind(this);
    this.handleParentMessage = this.handleParentMessage.bind(this);
    this.handleTabChange = this.handleTabChange.bind(this);
    this.handleCloseError = this.handleCloseError.bind(this);
    this.setSelectedData = this.setSelectedData.bind(this);
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
      if (!_.isEmpty(edge.groups)) {
        const edgesInGroup: Edge[] = this.state.viewData.diagrams[
          this.state.activeChild
        ].edges.filter((e) => _.intersection(e.groups, edge.groups).length > 0);
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
        console.log("new state", this.state);
      }
    );
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
    console.log("received message from parent", event.data);
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
              const errorMsg = "data object is missing nodes and/or edges";
              this.showError({ errorMsg }, type, meta.kind);
            } else {
              this.setState(
                produce((draft: AppState) => {
                  draft.error = { openSnackBar: false, errorMessage: null };
                  draft.viewData.diagrams[keyString] = { ...model, resetsDiagram: true };
                  Object.entries(draft.viewData.diagrams).forEach(
                    ([k, { nodes, edges }]) =>
                      (this.gojsIndexes[k] = new GoJSIndex({ nodes, edges }))
                  );
                  if (!draft.activeChild) {
                    // setting the active tab to the first diagram by default
                    draft.activeChild = keyString;
                  }
                }),
                () => {
                  vscode.setState(this.state);
                  console.log("new state", this.state);
                }
              );
            }
          } else {
            if (!model.content) {
              this.showError({ errorMsg: "data object is missing content" }, type, meta.kind);
            } else {
              this.setState(
                produce((draft: AppState) => {
                  draft.error = { openSnackBar: false, errorMessage: null };
                  draft.viewData.htmlDocs[keyString] = model;
                  // setting the active tab to the first tab by default if no diagrams yet
                  if (!draft.activeChild) {
                    draft.activeChild = keyString;
                  }
                }),
                () => {
                  vscode.setState(this.state);
                  console.log("new state", this.state);
                }
              );
            }
          }
          break;
        case "update":
          console.log("received update message", event.data);
          if (meta.kind === "diagram") {
            if (!isDiagramData(model)) {
              const errorMsg = "data object is missing nodes and/or edges";
              this.showError({ errorMsg }, type, meta.kind);
            } else {
              console.log("no errors, need to update diagram model now");
            }
          } else {
            if (!model.content) {
              this.showError({ errorMsg: "data object is missing content" }, type, meta.kind);
            } else {
              console.log("no errors, need to update html");
            }
          }
          break;
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
    console.log(`setting state (notify: ${notify})`, delta);

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
   * Handle changes to the active tab, updating the displayed diagram.
   * @param event The change event.
   * @param newValue The index of the new active tab as a string.
   */
  public handleTabChange(_: React.ChangeEvent<{}>, newValue: string) {
    vscode.postMessage({
      type: "view/didChange",
      viewData: {
        current: newValue,
        previous: this.state.activeChild,
      },
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
        {this.state.error && (
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

    let tabLabels: TabLabelType[] = [];
    this.forEachViewDataModel(({ key, model, index }) =>
      tabLabels.push({
        key: key,
        label: model.templates?.diagramLabel ?? model.meta?.label ?? `View ${index}`,
        loading: model.type?.willRender ?? false,
      })
    );
    tabLabels = sortBy(tabLabels, "[1]");

    return (
      <TabContext value={this.state.activeChild.toString()}>
        <LayoutWrapper
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
              />
            }
          </div>
        </LayoutWrapper>
      </TabContext>
    );
  }

  private forEachViewDataModel(
    f: (viewData: { key: string; model: DiagramData | HtmlModel; index: number }) => void
  ) {
    let i = 1;
    _.each(this.state.viewData.diagrams, (model, key) => f({ key, model, index: i++ }));
    _.each(this.state.viewData.htmlDocs, (model, key) => f({ key, model, index: i++ }));
  }

  // TODO: Replace the viewData map with something more iterable.
  private forEachView(
    f: (view: { key: ViewKey; keyUri: string; model: ViewModel; index: number }) => void
  ) {
    let i = 1;
    _.each(this.state.viewData.diagrams, (model, key) => {
      f({ keyUri: key, key: stringToViewKey(key), model, index: i++ });
    });
    _.each(this.state.viewData.htmlDocs, (model, key) => {
      f({ keyUri: key, key: stringToViewKey(key), model, index: i++ });
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
