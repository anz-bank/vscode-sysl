import React from "react";
import { TabPanel } from "@material-ui/lab";

import { DiagramData } from "../diagram/DiagramTypes";
import { DiagramWrapper } from "../diagram/DiagramWrapper";
import { DiagramSnapshotter } from "../diagram/SnapshottingDiagram";
import { HtmlModel } from "../html/HtmlModel";

type PropType = {
  classes: any;
  data: {
    diagrams: { [key: string]: DiagramData };
    htmlDocs: { [key: string]: HtmlModel };
  };
  activeChild: string;
  handleDiagramEvent: (e: go.DiagramEvent) => void;
  handleModelChange: (delta: go.IncrementalData) => void;
  selectedData: DiagramData | null;
};
class MainContainer extends React.Component<PropType> {
  public render() {
    return (
      <>
        {Object.keys(this.props.data.diagrams).map((k) => {
          const data = this.props.data.diagrams[k];
          const key = data.templates ? "custom" : "";
          const active = this.props.activeChild === k;
          return (
            <TabPanel
              classes={{ root: this.props.classes.tabPanel }}
              value={k}
              key={k}
              data-testid={k}
            >
              <DiagramSnapshotter active={active} name={data.templates?.diagramLabel}>
                <DiagramWrapper
                  selectedData={this.props.selectedData}
                  diagramKey={key}
                  nodes={data.nodes}
                  edges={data.edges}
                  templates={data.templates}
                  skipsDiagramUpdate={data.skipsDiagramUpdate || false}
                  onDiagramEvent={this.props.handleDiagramEvent}
                  onModelChange={this.props.handleModelChange}
                />
              </DiagramSnapshotter>
            </TabPanel>
          );
        })}
        {Object.keys(this.props.data.htmlDocs).map((k) => {
          return (
            <TabPanel
              classes={{ root: this.props.classes.tabPanel }}
              value={k}
              key={k}
              data-testid={k}
            >
              <iframe
                title={k}
                srcDoc={this.props.data.htmlDocs[k].content}
                style={{
                  height: "100%",
                  width: "100%",
                  border: 0,
                }}
              />
            </TabPanel>
          );
        })}
      </>
    );
  }
}

export default MainContainer;
