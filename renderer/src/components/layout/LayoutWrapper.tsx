import React, { useState } from "react";

import { DiagramData, Node } from "../diagram/DiagramTypes";
import DescriptionPane from "./DescriptionPane";
import ComponentTree from "./ComponentTree";
import TopBar from "./TopBar";
import { makeStyles } from "@material-ui/styles";

const leftPanelWidth = 300;
const rightPanelWidth = 300;

const useStyles = makeStyles({
  center: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
  },
});

type PropType = {
  activeNodes: Node[];
  handleTabChange: (event: React.ChangeEvent<{}>, value: string) => void;
  onSelectionChanged: (selections: DiagramData) => void;
  tabLabels: string[][];
  children: React.ReactNode;
  selectedData: DiagramData | null;
};

export default function LayoutWrapper(props: PropType) {
  const classes = useStyles();

  const [state, setState] = useState({
    leftPanel: {
      open: false,
    },
    rightPanel: {
      open: false,
    },
  });

  /**
   * Toggles visibility of side panels.
   */
  const toggleSidePanel = (panel: string, newValue: boolean) => {
    setState((prevState) => ({
      ...prevState,
      [panel]: { open: newValue },
    }));
  };

  const marginLeft = state.leftPanel.open ? leftPanelWidth : 0;
  const marginRight = state.rightPanel.open ? rightPanelWidth : 0;

  return (
    <>
      <ComponentTree
        drawerWidth={leftPanelWidth}
        open={state.leftPanel.open}
        selectedData={props.selectedData}
        onSelectionChanged={props.onSelectionChanged}
        activeNodes={props.activeNodes}
        toggleVisibility={toggleSidePanel.bind(null, "leftPanel")}
      />
      <div
        className={classes.center}
        style={{
          marginLeft,
          marginRight,
        }}
      >
        <TopBar
          width={`calc(100vw - ${marginLeft}px - ${marginRight}px)`}
          tabLabels={props.tabLabels}
          handleTabChange={props.handleTabChange}
          showLeftButton={!state.leftPanel.open}
          showRightButton={!state.rightPanel.open}
          toggleLeftPanel={toggleSidePanel.bind(null, "leftPanel", !state.leftPanel.open)}
          toggleRightPanel={toggleSidePanel.bind(null, "rightPanel", !state.rightPanel.open)}
        />
        {props.children}
      </div>
      <DescriptionPane
        drawerWidth={rightPanelWidth}
        open={state.rightPanel.open}
        selectedData={props.selectedData}
        toggleVisibility={toggleSidePanel.bind(null, "rightPanel")}
      />
    </>
  );
}
