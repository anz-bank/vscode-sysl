import { styled } from "@mui/material/styles";
import { Box, Drawer, Typography, IconButton, List } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { ChevronRight, Description } from "@mui/icons-material";

import { Node, Edge } from "../diagram/DiagramTypes";
import DescriptionItemDetails from "./DescriptionItemDetails";

const DrawerHeader = styled("div")(() => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
}));

const drawerHeaderStyle = {
  minHeight: 48,
};

export default function DescriptionPane(props: any) {
  const drawerWidth = props.drawerWidth || 200;
  const selectionLength = props.selectedData
    ? props.selectedData.nodes.length + props.selectedData.edges.length
    : 0;

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
          },
        }}
        variant="persistent"
        anchor="right"
        open={props.open}
      >
        <DrawerHeader style={drawerHeaderStyle}>
          <IconButton
            onClick={() => {
              props.toggleVisibility(false);
            }}
          >
            <ChevronRight />
          </IconButton>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%"
            }}
          >
            <Typography
              sx={{
                lineHeight: 1,
                fontSize: "0.8rem",
                textAlign: "center"
              }}
              variant="body1"
            >
              Selection Details
            </Typography>
            <Typography
              sx={{
                fontWeight: "light",
                lineHeight: 1,
                fontSize: "0.7rem",
                textAlign: "center"
              }}
              variant="caption"
            >
              {props.selectedData && selectionLength > 0
                ? `${selectionLength} item${selectionLength > 1 ? "s" : ""} selected`
                : "Nothing selected yet"}
            </Typography>
          </div>
        </DrawerHeader>
        {props.selectedData && selectionLength > 0 ? (
          <List component="div" disablePadding>
            {props.selectedData.nodes.map((node: Node) => {
              return <DescriptionItemDetails open={true} key={node.key} type="node" item={node} />;
            })}
            {props.selectedData.edges.map((edge: Edge) => {
              return <DescriptionItemDetails open={true} key={edge.key} type="edge" item={edge} />;
            })}
          </List>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              padding: "1rem",
              color: "rgba(0,0,0, .54)",
            }}
          >
            <Description fontSize="large" sx={{ paddingBottom: "1rem" }} />
            <Typography variant="body2">
              Select something in the diagram to view its details here.
            </Typography>
          </div>
        )}
      </Drawer>
    </Box>
  );
}
