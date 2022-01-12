import { useState } from "react";
import {
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse,
  Typography,
  Divider,
  Tooltip,
} from "@mui/material";
import { ExpandLess, ExpandMore, ArrowForward, Label } from "@mui/icons-material";

export default function DescriptionItemDetails(props: any) {
  const [open, setOpen] = useState(props.open);

  const handleClick = () => {
    setOpen(!open);
  };

  const textColor = open ? "primary" : "default";
  const iconColor = open ? "primary" : "inherit";

  const ignoreAttributes = [
    "expanded",
    "category",
    "isgroup",
    "visible",
    "location",
    "__gohashid",
  ].concat(props.ignore ?? []);

  return (
    <>
      <ListItemButton data-testid={"selected_" + props.item.key} onClick={handleClick}>
        <ListItemIcon
          sx={{
            minWidth: "auto",
            marginRight: "0.5rem",
          }}
        >
          {props.type === "node" ? (
            <Label color={iconColor} fontSize="small" />
          ) : (
            <ArrowForward color={iconColor} fontSize="small" />
          )}
        </ListItemIcon>
        <ListItemText
          disableTypography
          primary={
            <Tooltip title={props.item.label as string} placement="left">
              <Typography
                color={textColor}
                sx={{
                  lineHeight: 1,
                  fontSize: "0.7rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                variant="body2"
              >
                {props.item.label}
              </Typography>
            </Tooltip>
          }
          secondary={
            <Tooltip title={props.item.key as string} placement="left">
              <Typography
                color={textColor}
                sx={{
                  fontWeight: "light",
                  fontSize: "0.6rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textTransform: "uppercase",
                }}
                variant="body2"
              >
                {props.item.key}
              </Typography>
            </Tooltip>
          }
        />
        {open ? (
          <ExpandLess fontSize="small" color={iconColor} />
        ) : (
          <ExpandMore fontSize="small" color="action" />
        )}
      </ListItemButton>
      <Collapse
        sx={{
          padding: "0 16px",
          pl: 4,
        }}
        in={open}
        timeout="auto"
        unmountOnExit
      >
        {Object.keys(props.item).map((key) => {
          return ignoreAttributes.includes(key.toLowerCase()) ||
            key.toLowerCase().includes("color") ||
            props.item[key]?.toString().trim().length < 1 ? null : (
            <div key={key}>
              <Typography
                sx={{
                  fontWeight: "light",
                  lineHeight: 1,
                  fontSize: "0.6rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                variant="overline"
              >
                {key}
              </Typography>
              <Tooltip title={props.item[key] as string} placement="left">
                <Typography
                  sx={{
                    lineHeight: 1,
                    fontSize: "0.7rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  variant="subtitle1"
                >
                  {props.item[key]}
                </Typography>
              </Tooltip>
              <br />
            </div>
          );
        })}
      </Collapse>
      {open && <Divider />}
    </>
  );
}
