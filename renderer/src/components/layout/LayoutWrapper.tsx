import React, { useState } from "react";
import { Box, Grid, AppBar, Toolbar, Button, Tab } from "@mui/material";
import { AccountTree, Description } from "@mui/icons-material";
import { TabList } from "@material-ui/lab";

import { DiagramData, Node } from "../diagram/DiagramTypes";
import DescriptionPane from "./DescriptionPane";
import ComponentTree from "./ComponentTree";

type PropType = {
  activeNodes: Node[];
  handleTabChange: (event: React.ChangeEvent<{}>, value: string) => void;
  onSelectionChanged: (selections: DiagramData) => void;
  diagramLabels: string[];
  children: React.ReactNode;
  selectedData: DiagramData | null;
};
export default function LayoutWrapper(props: PropType) {
  const [state, setState] = useState({
    leftPanel: {
      open: false,
    },
    rightPanel: {
      open: false,
    },
  });

  /**
   * Toggles visibility of side panels
   */
  const toggleSidePanel = (panel: string, newValue: boolean) => {
    setState((prevState) => ({
      ...prevState,
      [panel]: { open: newValue },
    }));
  };

  return (
    <>
      <AppBar sx={{ width: "100vw" }} color="transparent" position="static">
        <Toolbar variant="dense">
          <Grid justifyContent="space-between" container>
            <Grid
              xs={2}
              item
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "center",
              }}
            >
              <Button
                variant="text"
                onClick={() => {
                  toggleSidePanel("leftPanel", true);
                }}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: 8,
                  color: "rgba(0, 0, 0, 0.54)",
                }}
              >
                <AccountTree />
                Tree View
              </Button>
            </Grid>
            <Grid
              xs={8}
              sx={{
                display: "flex",
                justifyContent: "center",
              }}
              item
            >
              <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                <TabList
                  indicatorColor="primary"
                  textColor="primary"
                  variant="scrollable"
                  scrollButtons="auto"
                  onChange={props.handleTabChange}
                >
                  {props.diagramLabels.map((label: string, index: number) => (
                    <Tab key={index} label={label} value={index.toString()}></Tab>
                  ))}
                </TabList>
              </Box>
            </Grid>
            <Grid
              xs={2}
              item
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              <Button
                variant="text"
                onClick={() => {
                  toggleSidePanel("rightPanel", true);
                }}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: 8,
                  color: "rgba(0, 0, 0, 0.54)",
                }}
              >
                <Description />
                Description
              </Button>
            </Grid>
          </Grid>
        </Toolbar>
      </AppBar>
      <DescriptionPane
        open={state.rightPanel.open}
        selectedData={props.selectedData}
        toggleVisibility={toggleSidePanel.bind(null, "rightPanel")}
      >
        <ComponentTree
          open={state.leftPanel.open}
          selectedData={props.selectedData}
          onSelectionChanged={props.onSelectionChanged}
          activeNodes={props.activeNodes}
          toggleVisibility={toggleSidePanel.bind(null, "leftPanel")}
        >
          {props.children}
        </ComponentTree>
      </DescriptionPane>
    </>
  );
}
