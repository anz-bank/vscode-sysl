import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Tab from "@material-ui/core/Tab";
import { TabPanel, TabList, TabContext } from "@material-ui/lab";

import Diagram from "./components/Diagram";
import { DiagramData } from "./components/DiagramTypes";

const useStyles = makeStyles(() => ({
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
}));

const emptyData = [{ nodes: [], edges: [] }];

export default function App() {
  const [data, setData] = useState<DiagramData[]>(emptyData);
  const classes = useStyles();
  const [value, setValue] = useState("0");

  const handleChange = (event: React.ChangeEvent<{}>, newValue: string) => {
    setValue(newValue);
  };

  useEffect(() => {
    // Handle messages sent from the extension to the webview
    const onMessage = (event: MessageEvent) => {
      // The JSON data that the extension sent.
      const message = event.data;
      switch (message.type) {
        case "render":
          console.log("received render message", message.model);
          const model: DiagramData[] = message.model;
          setData(model);
          break;
      }
    };
    window.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("message", onMessage);
    };
  });

  if (data.length <= 1) {
    const diagramData = data[0] || emptyData[0]; // In case an empty array is set.
    const key = diagramData.templates ? "custom" : "";
    return (
      <div className={classes.root}>
        <Diagram
          diagramKey={key}
          template={diagramData.templates}
          nodes={diagramData.nodes}
          edges={diagramData.edges}
        />
      </div>
    );
  } else {
    return (
      <div className={classes.root}>
        <TabContext value={value}>
          <TabList classes={{ root: classes.tabs }} orientation="vertical" onChange={handleChange}>
            {data.map((diagramData, index) => {
              const label = diagramData.templates?.diagramLabel ?? `Diagram ${index + 1}`;
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
          {data.map((diagramData, index) => {
            const key = diagramData.templates ? "custom" : "";
            return (
              <TabPanel classes={{ root: classes.tabPanel }} value={index.toString()} key={index}>
                <Diagram
                  diagramKey={key}
                  template={diagramData.templates}
                  nodes={diagramData.nodes}
                  edges={diagramData.edges}
                />
              </TabPanel>
            );
          })}
        </TabContext>
      </div>
    );
  }
}
