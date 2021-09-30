import * as React from "react";
import * as go from "gojs";
import _ from "lodash";
import { produce } from "immer";
import { pick } from "lodash";

import { withStyles } from "@material-ui/styles";
import Tab from "@material-ui/core/Tab";
import { TabPanel, TabList, TabContext } from "@material-ui/lab";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert, { AlertProps } from "@material-ui/lab/Alert";

import { vscode } from "./components/vscode/VsCode";
import { DiagramData } from "./components/diagram/DiagramTypes";
import { DiagramWrapper } from "./components/diagram/DiagramWrapper";
import { GoJSIndex, shouldNotifyChange, updateState } from "./components/diagram/DiagramState";
import { DiagramSnapshotter } from "./components/diagram/SnapshottingDiagram";

type AppState = {
  diagrams: DiagramData[];
  selectedData: DiagramData | null;
  activeChild: number;
  error?: {
    openSnackBar: boolean;
    errorMessage: string | null;
  };
};

const initialState: AppState = {
  activeChild: 0,
  selectedData: null,
  diagrams: [],
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
    height: "100vh",
    width: "100vw",
  },
  tabs: {
    borderRight: "1px solid #666666",
    color: "#666666",
    flexShrink: 0,
  },
  tab: {
    minWidth: "auto",
  },
  tabPanel: {
    padding: 0,
    flexGrow: 1,
    height: "100vh",
  },
  alert: {
    whiteSpace: "pre-wrap",
  },
});

interface AppProps {
  classes: any;
}

type ParentMessageEvent = {
  data: {
    type: string;
    model: DiagramData[];
    error?: { [key: string]: any };
  };
};

type SelectionMessageEvent = {
  type: string;
  selectedData: {
    current: DiagramData | null,
    previous: DiagramData | null
  };
  error?: { [key: string]: any };
}

function Alert(props: AlertProps) {
  return <MuiAlert elevation={6} {...props} />;
}

function isDiagramData(model: DiagramData[]) {
  const hasNodesAndEdges = (obj: any) => obj.hasOwnProperty("nodes") && obj.hasOwnProperty("edges");
  return model.every(hasNodesAndEdges);
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
    nodes: _(diagram.nodes).keyBy('key').at(nodes).value(),
    edges: _(diagram.edges).keyBy('key').at(edges).value(),
    type: diagram.type
  };

  return diagramData;
}

class App extends React.Component<AppProps, AppState> {
  private gojsIndexes: GoJSIndex[];

  constructor(props: AppProps) {
    super(props);

    this.state = vscode.getState() || initialState;
    this.gojsIndexes = this.state.diagrams.map(
      ({ nodes, edges }) => new GoJSIndex({ nodes, edges })
    );

    // bind handler methods
    this.handleDiagramEvent = this.handleDiagramEvent.bind(this);
    this.handleModelChange = this.handleModelChange.bind(this);
    this.handleParentMessage = this.handleParentMessage.bind(this);
  }

  public componentDidMount() {
    window.addEventListener("message", this.handleParentMessage);
  }

  public componentWillUnmount() {
    window.removeEventListener("message", this.handleParentMessage);
  }

  /**
   * Updates state to show error in snackbar.
   * @param error received from extension
   */
  public showError = (error: { [key: string]: any }, action?: string) => {
    let errorText = "";
    switch (action) {
      case "render":
        errorText = `The diagram could not be rendered because the following error occurred:\n\n`;
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
  };

  /**
   * Handles close event of error snackbar.
   */
  public handleClose = (event?: React.SyntheticEvent, reason?: string) => {
    if (reason === "clickaway") {
      return;
    }
    this.setState({ error: { openSnackBar: false, errorMessage: null } }, () => {
      vscode.setState(this.state);
    });
  };

  /**
   * Handle messages sent from the extension to the webview.
   */
  public handleParentMessage(event: ParentMessageEvent) {
    const message = event.data;
    if (message.error) {
      this.showError(message.error, message.type);
    } else if (!message.model) {
      this.showError({ errorMsg: "data object not found/undefined" }, message.type);
    } else if (!isDiagramData(message.model)) {
      this.showError({ errorMsg: "data object is missing nodes and/or edges" }, message.type);
    } else {
      try {
        switch (message.type) {
          case "render":
            console.log("received render message", message.model);
            this.setState(
              produce((draft: AppState) => {
                draft.error = { openSnackBar: false, errorMessage: null };
                draft.diagrams = message.model.map((d) => ({ ...d, resetsDiagram: true }));
                this.gojsIndexes = draft.diagrams.map(
                  ({ nodes, edges }) => new GoJSIndex({ nodes, edges })
                );
              }),
              () => {
                vscode.setState(this.state);
              }
            );
            break;
        }
      } catch (e) {
        this.showError({ errorMsg: e }, message.type);
      }
    }
  }

  /**
   * Handle any relevant DiagramEvents, in this case just selection changes.
   * On ChangedSelection, find the corresponding data and set the selectedData state.
   * @param e a GoJS DiagramEvent
   */
  public handleDiagramEvent(e: go.DiagramEvent) {
    switch(e.name) {
      case "ChangedSelection":
        const selection = getDiagramData(e.subject.toArray(), this.state.diagrams[this.state.activeChild]);
        const message: SelectionMessageEvent = {
          type: "select",
          selectedData: {
            current: selection,
            previous: this.state.selectedData
          }
        }
        vscode.postMessage(message);
        this.setState({selectedData: selection});
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
        updateState(index, draft.diagrams[this.state.activeChild], delta);
      }),
      () => {
        vscode.setState(this.state);

        if (notify) {
          vscode.postMessage({
            type: "diagramModelChange",
            delta,
            model: pick(this.state.diagrams[this.state.activeChild], "nodes", "edges"),
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
  public handleTabChange(event: React.ChangeEvent<{}>, newValue: string) {
    this.setState(
      produce((draft: AppState) => {
        draft.activeChild = parseInt(newValue);
      })
    );
  }

  public render() {
    const { classes } = this.props;

    if (this.state.diagrams.length <= 1) {
      const data = this.state.diagrams[0] || { nodes: [], edges: [] };
      const key = data.templates ? "custom" : "";
      return (
        <div className={classes.root}>
          {this.state.error && (
            <Snackbar
              data-testid="error-snackbar"
              open={this.state.error.openSnackBar}
              onClose={this.handleClose}
            >
              <Alert classes={{ root: classes.alert }} onClose={this.handleClose} severity="error">
                {this.state.error.errorMessage}
              </Alert>
            </Snackbar>
          )}
          <DiagramSnapshotter name={data.templates?.diagramLabel}>
            <DiagramWrapper
              diagramKey={key}
              nodes={data.nodes}
              edges={data.edges}
              templates={data.templates}
              skipsDiagramUpdate={data.skipsDiagramUpdate || false}
              onDiagramEvent={this.handleDiagramEvent}
              onModelChange={this.handleModelChange}
            />
          </DiagramSnapshotter>
        </div>
      );
    } else {
      return (
        <div className={classes.root}>
          {this.state.error && (
            <Snackbar
              data-testid="error-snackbar"
              open={this.state.error.openSnackBar}
              onClose={this.handleClose}
            >
              <Alert classes={{ root: classes.alert }} onClose={this.handleClose} severity="error">
                {this.state.error.errorMessage}
              </Alert>
            </Snackbar>
          )}
          <TabContext value={this.state.activeChild.toString()}>
            <TabList
              classes={{ root: classes.tabs }}
              orientation="vertical"
              onChange={this.handleTabChange.bind(this)}
            >
              {this.state.diagrams.map((data, index) => {
                const label = data.templates?.diagramLabel ?? `Diagram ${index + 1}`;
                return (
                  <Tab
                    key={index}
                    classes={{ root: classes.tab }}
                    label={label}
                    value={index.toString()}
                  ></Tab>
                );
              })}
            </TabList>
            {this.state.diagrams.map((data, index) => {
              const key = data.templates ? "custom" : "";
              const active = this.state.activeChild === index;
              return (
                <DiagramSnapshotter active={active} name={data.templates?.diagramLabel}>
                  <TabPanel
                    classes={{ root: classes.tabPanel }}
                    value={index.toString()}
                    key={index}
                  >
                    <DiagramWrapper
                      diagramKey={key}
                      nodes={data.nodes}
                      edges={data.edges}
                      templates={data.templates}
                      skipsDiagramUpdate={data.skipsDiagramUpdate || false}
                      onDiagramEvent={this.handleDiagramEvent}
                      onModelChange={this.handleModelChange}
                    />
                  </TabPanel>
                </DiagramSnapshotter>
              );
            })}
          </TabContext>
        </div>
      );
    }
  }
}

export default withStyles(styles)(App);
