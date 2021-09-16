import * as React from "react";
import * as go from "gojs";
import { produce } from "immer";
import { pick } from "lodash";

import { withStyles } from "@material-ui/styles";
import Tab from "@material-ui/core/Tab";
import { TabPanel, TabList, TabContext } from "@material-ui/lab";

import { vscode } from "./components/vscode/VsCode";
import { DiagramData } from "./components/diagram/DiagramTypes";
import { DiagramWrapper } from "./components/diagram/DiagramWrapper";
import { GoJSIndex, shouldNotifyChange, updateState } from "./components/diagram/DiagramState";

type AppState = {
  diagrams: DiagramData[];
  activeChild: number;
};

const initialState: AppState = {
  activeChild: 0,
  diagrams: [],
};

const styles = () => ({
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
});

interface AppProps {
  classes: any;
}

type ParentMessageEvent = {
  data: {
    type: string;
    model: DiagramData[];
  };
};

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
   * Handle messages sent from the extension to the webview.
   */
  public handleParentMessage(event: ParentMessageEvent) {
    const message = event.data;
    switch (message.type) {
      case "render":
        console.log("received render message", message.model);

        this.setState(
          produce((draft: AppState) => {
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
  }

  /**
   * Handle any relevant DiagramEvents, in this case just selection changes.
   * On ChangedSelection, find the corresponding data and set the selectedData state.
   * @param e a GoJS DiagramEvent
   */
  public handleDiagramEvent(e: go.DiagramEvent) {
    // TODO: Publish selection change events to the extension.
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
          <DiagramWrapper
            diagramKey={key}
            nodes={data.nodes}
            edges={data.edges}
            templates={data.templates}
            skipsDiagramUpdate={data.skipsDiagramUpdate || false}
            onDiagramEvent={this.handleDiagramEvent}
            onModelChange={this.handleModelChange}
          />
        </div>
      );
    } else {
      return (
        <div className={classes.root}>
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
              return (
                <TabPanel classes={{ root: classes.tabPanel }} value={index.toString()} key={index}>
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
              );
            })}
          </TabContext>
        </div>
      );
    }
  }
}

export default withStyles(styles)(App);
