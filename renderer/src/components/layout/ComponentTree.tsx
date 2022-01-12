import React, { useState, useEffect } from "react";
import { styled } from "@mui/material/styles";
import { makeStyles } from "@material-ui/styles";
import { Box, Drawer, IconButton, Typography } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { ChevronLeft, ChevronRight, ExpandMore } from "@mui/icons-material";
import TreeView from "@mui/lab/TreeView";
import { CustomTreeItem } from "./CustomTreeItem";
import _ from "lodash";

const DrawerHeader = styled("div")(() => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
}));

const drawerHeaderStyle = {
  minHeight: 48,
};

const useStyles = makeStyles({
  label: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  box: { display: "flex" },
  drawer: {
    flexShrink: 0,
  },
  treeview: {
    overflowX: "hidden",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    color: "rgba(0,0,0, .75)",
  },
  title: {
    display: "flex",
    justifyContent: "center",
    flex: 1,
    lineHeight: 1,
    fontSize: "0.8rem",
  },
});

export default function ComponentTree(props: any) {
  const drawerWidth = props.drawerWidth || 200;

  const [nodes, setNodes] = useState(props.activeNodes);
  const [expanded, setExpanded] = useState(_.map(_.filter(props.activeNodes, "isGroup"), "key"));
  const classes = useStyles();

  useEffect(() => {
    setNodes(props.activeNodes);
    setExpanded(_.map(_.filter(props.activeNodes, "isGroup"), "key"));
  }, [props.activeNodes]);

  const treeNode = (node: any) => (
    <CustomTreeItem
      classes={{ label: classes.label }}
      key={node.key}
      nodeId={node.key}
      label={<Typography variant="caption">{node.label}</Typography>}
    >
      {Array.isArray(node.children) ? node.children.map((node: any) => treeNode(node)) : null}
    </CustomTreeItem>
  );

  /**
   * Convert the flat list of nodes into a hierarchical list for rendering the tree view.
   * @param nodeList flat list of nodes.
   * @returns hierarchical list of nodes, each child listed under the parent.
   */
  const constructGrouping = (nodeList: go.ObjectData[]) => {
    const groups = _.groupBy(nodeList, (node) => node.group || "root");
    const nodes = _.keyBy(nodeList, "key");
    _.each(_.omit(groups, "root"), function (children, parentId) {
      nodes[parentId].children = _.sortBy(children, "label");
    });

    return {
      key: "components",
      expanded: true,
      children: _.sortBy(groups["root"], "label"),
    };
  };

  /**
   * Update diagram with selections made in the tree.
   */
  function selectionChange(nodeIds: Array<string>) {
    const nodes = _(props.activeNodes).keyBy("key").at(nodeIds).value();
    props.onSelectionChanged({ nodes: nodes, edges: [] });
  }

  return (
    <Box classes={{ root: classes.box }}>
      <CssBaseline />
      <Drawer
        classes={{ root: classes.drawer }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
        variant="persistent"
        anchor="left"
        open={props.open}
      >
        <DrawerHeader style={drawerHeaderStyle}>
          <Typography classes={{ root: classes.title }} variant="body1">
            Elements
          </Typography>
          <IconButton onClick={() => props.toggleVisibility(false)}>
            <ChevronLeft />
          </IconButton>
        </DrawerHeader>
        <TreeView
          classes={{ root: classes.treeview }}
          multiSelect={true}
          onNodeSelect={(_: React.SyntheticEvent, nodeIds: Array<string>) =>
            selectionChange(nodeIds)
          }
          onNodeToggle={(_: React.SyntheticEvent, nodeIds: Array<string>) => setExpanded(nodeIds)}
          expanded={expanded}
          selected={props.selectedData?.nodes.map((node: any) => node.key) ?? null}
          defaultCollapseIcon={<ExpandMore />}
          defaultExpandIcon={<ChevronRight />}
        >
          {nodes && constructGrouping(JSON.parse(JSON.stringify(nodes))).children?.map(treeNode)}
        </TreeView>
      </Drawer>
    </Box>
  );
}
