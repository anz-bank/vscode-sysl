import React from "react";
import { TabPanel } from "@material-ui/lab";

import { DiagramData } from "../diagram/DiagramTypes";
import { DiagramWrapper } from "../diagram/DiagramWrapper";
import { DiagramSnapshotter } from "../diagram/SnapshottingDiagram";
import { HtmlModel } from "../html/HtmlModel";
import { Change, TableModel } from "../table/TableModel";
import TableView from "../table/TableView";
import { makeStyles } from "@material-ui/core";

const useStyles = makeStyles({
  container: {
    width: "100%",
    overflow: "auto",
  },
});

type PropType = {
  classes: any;
  data: {
    diagrams: { [key: string]: DiagramData };
    htmlDocs: { [key: string]: HtmlModel };
    tables: { [key: string]: TableModel };
  };
  activeChild: string;
  handleDiagramEvent: (e: go.DiagramEvent) => void;
  handleModelChange: (delta: go.IncrementalData) => void;
  handleTableModelChange: (delta: Change[], source: string) => void;
  selectedData: DiagramData | null;
};

export default function MainContainer(props: PropType) {
  const classes = useStyles();
  return (
    <>
      {Object.entries(props.data.diagrams).map(([k, data]) => {
        const key = data.templates ? "custom" : "";
        const active = props.activeChild === k;
        return (
          <TabPanel classes={{ root: props.classes.tabPanel }} value={k} key={k} data-testid={k}>
            <DiagramSnapshotter active={active} name={data.templates?.diagramLabel}>
              <DiagramWrapper
                selectedData={props.selectedData}
                diagramKey={key}
                nodes={data.nodes}
                edges={data.edges}
                templates={data.templates}
                skipsDiagramUpdate={data.skipsDiagramUpdate || false}
                onDiagramEvent={props.handleDiagramEvent}
                onModelChange={props.handleModelChange}
              />
            </DiagramSnapshotter>
          </TabPanel>
        );
      })}
      {Object.entries(props.data.htmlDocs).map(([k, data]) => (
        <TabPanel
          className={classes.container}
          classes={{ root: props.classes.tabPanel }}
          value={k}
          key={k}
          data-testid={k}
        >
          <iframe
            title={k}
            srcDoc={data.content}
            style={{ height: "100%", width: "100%", border: 0 }}
          />
        </TabPanel>
      ))}
      {Object.entries(props.data.tables).map(([k, model]) => (
        <TabPanel
          className={classes.container}
          classes={{ root: props.classes.tabPanel }}
          value={k}
          key={k}
          data-testid={k}
        >
          <TableView model={model} onChange={props.handleTableModelChange} />
        </TabPanel>
      ))}
    </>
  );
}
