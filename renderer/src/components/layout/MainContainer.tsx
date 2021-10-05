import React from "react";
import { TabPanel } from "@material-ui/lab";

import { DiagramData } from "../diagram/DiagramTypes";
import { DiagramWrapper } from "../diagram/DiagramWrapper";
import { DiagramSnapshotter } from "../diagram/SnapshottingDiagram";

type PropType = {
  classes: any;
  diagrams: DiagramData[];
  activeChild: number;
  handleDiagramEvent: (e: go.DiagramEvent) => void;
  handleModelChange: (delta: go.IncrementalData) => void;
};
class MainContainer extends React.Component<PropType> {
  public render() {
    return (
      <>
        {this.props.diagrams.map((data, index) => {
          const key = data.templates ? "custom" : "";
          const active = this.props.activeChild === index;
          return (
            <TabPanel
              classes={{ root: this.props.classes.tabPanel }}
              value={index.toString()}
              key={index}
            >
              <DiagramSnapshotter active={active} name={data.templates?.diagramLabel}>
                <DiagramWrapper
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
      </>
    );
  }
}

export default MainContainer;
