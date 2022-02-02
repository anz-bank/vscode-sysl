import React from "react";
import { AppBar, Toolbar, Tab, Button, CircularProgress } from "@mui/material";
import { AccountTree, Description, CancelOutlined } from "@mui/icons-material";
import { TabList } from "@material-ui/lab";
import { makeStyles } from "@mui/styles";
import { SxProps } from "@mui/system";
import { TabLabelType } from "./LayoutTypes";

export enum tabLabelIcon {
	none = 0,
	loading,
	failed
};

const LoadingIcon = () => <CircularProgress
  data-testid="loading-spinner"
  size={16}
  style={{
    verticalAlign: "middle",
    marginRight: "10px"
    }}
/>;

const ErrorIcon = () => <span data-testid="error-icon">
  <CancelOutlined
    sx={{
      color: "red",
      verticalAlign: "middle",
      marginRight: "5px",
      display: "flex",
      fontSize: 18
    }}
  />
</span>;

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
  tabLabels: TabLabelType[];
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
            {props.tabLabels.map(({ key, label, flag }) => (
              <Tab
                key={key}
                label={
                  <div style={{ display: "flex" }}>
                    {
                      flag === tabLabelIcon.loading
                      ? <LoadingIcon />
                      : flag === tabLabelIcon.failed
                        ? <ErrorIcon />
                        : null
                    }
                    <span>{label}</span>
                  </div>
                }
                value={key}
                disabled={flag === tabLabelIcon.loading}
              />
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
