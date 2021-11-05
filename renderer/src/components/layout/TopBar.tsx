import React from "react";
import { AppBar, Toolbar, Tab, Button } from "@mui/material";
import { AccountTree, Description } from "@mui/icons-material";
import { TabList } from "@material-ui/lab";
import { makeStyles } from "@mui/styles";
import { SxProps } from "@mui/system";

const buttonStyle: SxProps = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  fontSize: 8,
  color: "rgba(0, 0, 0, 0.54)",
};

const useStyles = makeStyles({
  toolbar: {
    display: "flex",
    flexDirection: "row",
  },
  tabContainer: {
    display: "flex",
    flexGrow: 1,
    overflow: "hidden",
    justifyContent: "center",
  },
});

function PanelButton(props: any) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
      }}
    >
      <Button onClick={props.onClick} sx={buttonStyle}>
        {props.icon}
        {props.label}
      </Button>
    </div>
  );
}

type PropType = {
  width?: string;
  tabLabels: string[][];
  handleTabChange: (event: React.ChangeEvent<{}>, value: string) => void;
  showLeftButton: boolean;
  showRightButton: boolean;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
};

export default function TopBar(props: PropType) {
  const classes = useStyles();

  return (
    <AppBar color="transparent" position="static" style={{ width: props.width }}>
      <Toolbar variant="dense" className={classes.toolbar}>
        {props.showLeftButton && (
          <PanelButton onClick={props.toggleLeftPanel} icon={<AccountTree />} label={"Tree View"} />
        )}
        <div className={classes.tabContainer}>
          <TabList
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            onChange={props.handleTabChange}
          >
            {props.tabLabels.map(([key, label]) => (
              <Tab key={key} label={label} value={key} />
            ))}
          </TabList>
        </div>
        {props.showRightButton && (
          <PanelButton
            onClick={props.toggleRightPanel}
            icon={<Description />}
            label={"Description"}
          />
        )}
      </Toolbar>
    </AppBar>
  );
}
