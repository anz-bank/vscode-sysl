import React from "react";
import { Typography, Tooltip } from "@mui/material";
import TreeItem, { TreeItemProps, useTreeItem, TreeItemContentProps } from "@mui/lab/TreeItem";
import clsx from "clsx";

/**
 * The following code is to create ContentComponent prop
 * for the TreeItem mui component.
 * https://mui.com/components/tree-view/#contentcomponent-prop
 */

export const CustomTreeItem = (props: TreeItemProps) => (
  <TreeItem ContentComponent={CustomContentRef} {...props} />
);

/** Defining the component with a forwardRef as required by ContentComponent prop.
 * https://mui.com/api/tree-item/
 */
const CustomContentRef = React.forwardRef(CustomContent);

/**
 * Deconstructing the TreeItem component to define specific onClick behaviours
 * for each element, to override TreeItem's default behaviour.
 */
function CustomContent(props: TreeItemContentProps, ref: React.Ref<any>) {
  const { classes, className, label, nodeId, icon, expansionIcon, displayIcon } = props;
  const {
    disabled,
    expanded,
    selected,
    focused,
    handleExpansion,
    handleSelection,
    preventSelection,
  } = useTreeItem(nodeId);

  const iconEl = icon || expansionIcon || displayIcon;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={clsx(className, classes.root, {
        [classes.expanded]: expanded,
        [classes.selected]: selected,
        [classes.focused]: focused,
        [classes.disabled]: disabled,
      })}
      // Prevent selection of the TreeItem if wrapper div is clicked.
      onMouseDown={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => preventSelection(e)}
      ref={ref as React.Ref<HTMLInputElement>}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
      <div
        // Expand/collapse the TreeItem if its icon is clicked (and the TreeItem has children).
        onClick={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => handleExpansion(e)}
        className={classes.iconContainer}
      >
        {iconEl}
      </div>
      <Tooltip title={label as string} placement="right">
        <Typography
          // Select the TreeItem if its label is clicked.
          onClick={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => handleSelection(e)}
          component="div"
          data-testid={nodeId}
          className={classes.label}
        >
          {label}
        </Typography>
      </Tooltip>
    </div>
  );
}
