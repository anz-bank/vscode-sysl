import * as go from "gojs";
import _ from "lodash";

import {
  TemplateData,
  TemplateEdgeData,
  TemplateGroupData,
  TemplateNodeData,
  TemplateSectionData,
  TemplateShadowData,
  TemplateShape,
  TemplateTextBlock,
} from "./DiagramTypes";
import { stringifyPoint } from "./DiagramUtil";

const $ = go.GraphObject.make;

export default function DiagramTemplate(props?: TemplateData) {
  const diagram = $(go.Diagram, {
    "undoManager.isEnabled": true,
    "undoManager.maxHistoryLength": 0,
    "animationManager.isEnabled": false,
    model: $(go.GraphLinksModel, { linkKeyProperty: "key" }),
    initialAutoScale: go.Diagram.Uniform,
    autoScrollRegion: 0,
    allowMove: true,
  });

  // Set layout if provided, else default to no layout.
  if (props?.diagramLayout) {
    diagram.layout = new props.diagramLayout();
  }

  // restrict nodes positions to a grid
  diagram.grid.gridCellSize = new go.Size(16, 16);
  diagram.toolManager.draggingTool.isGridSnapEnabled = true;

  /**
   * The default template to display a node.
   *
   * The node is rendered as a plain white rectangle that displays the node label.
   */
  const nodeTemplate = $(
    go.Node,
    "Auto",
    $(
      go.Shape,
      "Rectangle",
      { height: 96, width: 256, stroke: "black", fill: "white" },
      new go.Binding("fill", "bgColor"),
      new go.Binding("stroke", "strokeColor")
    ),
    getTextBlockStyle({ margin: "10", label: "label" }),
    new go.Binding("location", "location", go.Point.parse).makeTwoWay(stringifyPoint)
  );

  /**
   * The default template to display a group.
   *
   * The group is rendered as a plain grey rounded rectangle that displays the group label.
   */
  const groupTemplate = $(
    go.Group,
    "Vertical",
    $(
      go.Panel,
      "Auto",
      $(go.Shape, "RoundedRectangle", {
        parameter1: 2,
        fill: "#ECECEC",
      }),
      $(
        "SubGraphExpanderButton",
        {
          alignment: go.Spot.TopRight,
          alignmentFocus: go.Spot.TopRight,
        },
        { padding: 8 },
        new go.Binding("visible", "showUI").ofModel()
      ),
      $(go.Placeholder, { padding: 32 })
    ),
    getTextBlockStyle({ label: "label" }),
    new go.Binding("avoidable", "expanded", (e) => !e),
    new go.Binding("location", "location", go.Point.parse).makeTwoWay(stringifyPoint)
  );

  /**
   * The default template to display a link.
   */
  const linkTemplate = $(
    go.Link,
    {
      routing: go.Link.AvoidsNodes,
      curve: go.Link.JumpGap,
      corner: 10,
    },
    new go.Binding("isLayoutPositioned", "true"),
    $(go.Shape, new go.Binding("stroke", "color")),
    $(go.Shape, new go.Binding("fill", "color"), new go.Binding("stroke", "color"), {
      toArrow: "Standard",
    })
  );

  diagram.nodeTemplateMap = new go.Map<string, go.Node>([{ key: "", value: nodeTemplate }]);
  _.each(props?.nodes, (value, key) =>
    diagram.nodeTemplateMap.add(key, getCustomNodeTemplate(value))
  );

  diagram.groupTemplateMap = new go.Map<string, go.Group>([{ key: "", value: groupTemplate }]);
  _.each(props?.groups, (value, key) =>
    diagram.groupTemplateMap.add(key, getCustomGroupTemplate(value))
  );

  diagram.linkTemplateMap = new go.Map<string, go.Link>([{ key: "", value: linkTemplate }]);
  _.each(props?.edges, (value, key) =>
    diagram.linkTemplateMap.add(key, getCustomLinkTemplate(value))
  );

  return diagram;
}

/**
 * Returns the custom template to display a node
 *
 * @param nodeTemplate: A TemplateNodeData object
 * @returns a GoJS node template
 **/
function getCustomNodeTemplate(nodeTemplate: TemplateNodeData): go.Node {
  return $(
    go.Node,
    "Auto",
    nodeTemplate.shadow ? getShadowStyle(nodeTemplate.shadow) : {},
    $(go.Panel, "Horizontal", nodeTemplate.sections ? getSectionStyles(nodeTemplate.sections) : {}),
    new go.Binding("location", "location", go.Point.parse).makeTwoWay(stringifyPoint)
  );
}

/**
 * Return the custom template to display a group
 *
 * @param groupTemplate: a TemplateGroupData object
 * @returns a GoJS group template
 **/
function getCustomGroupTemplate(groupTemplate: TemplateGroupData): go.Group {
  return $(
    go.Group,
    "Position",
    new go.Binding("avoidable", "expanded", (e) => !e),
    new go.Binding("isSubGraphExpanded", "expanded").makeTwoWay(),
    new go.Binding("location", "location", go.Point.parse).makeTwoWay(stringifyPoint),
    groupTemplate.shadow ? getShadowStyle(groupTemplate.shadow) : {},

    // Collapsed group view
    groupTemplate.collapsed
      ? $(
          go.Panel,
          "Spot",
          new go.Binding("visible", "expanded", (e) => {
            return !e;
          }),
          getSectionStyles(groupTemplate.collapsed),
          $(
            "SubGraphExpanderButton",
            {
              alignment: go.Spot.TopRight,
              alignmentFocus: go.Spot.TopRight,
            },
            { padding: 8 },
            new go.Binding("visible", "showUI").ofModel()
          )
        )
      : {},

    // Expanded group view
    groupTemplate.expanded
      ? $(
          go.Panel,
          "Spot",
          new go.Binding("visible", "expanded"),
          getSectionStyles(groupTemplate.expanded),
          $(
            go.Panel,
            "Spot",
            {
              alignment: go.Spot.TopRight,
              alignmentFocus: go.Spot.TopRight,
            },
            $(
              "SubGraphExpanderButton", // minimise/maximise button
              { margin: go.Margin.parse("8 8 8 8") },
              new go.Binding("visible", "showUI").ofModel()
            )
          )
        )
      : {}
  );
}

/**
 * Returns the custom template to display a link
 *
 * @param linkTemplate: A TemplateEdgeData object
 * @returns a GoJS link template
 **/
function getCustomLinkTemplate(linkTemplate: TemplateEdgeData): go.Link {
  return $(
    go.Link,
    {
      routing: go.Link.AvoidsNodes,
      corner: linkTemplate.corner,
      curve: go.Link.JumpGap,
      fromSpot: go.Spot.AllSides,
      toSpot: go.Spot.AllSides,
    },
    getShapeStyle(linkTemplate.pathShape ?? {}),
    linkTemplate.arrowShape ? getShapeStyle(linkTemplate.arrowShape) : {},
    linkTemplate.text ? getTextBlockStyle(linkTemplate.text) : {},
    new go.Binding("visible", "visible")
  );
}

/**
 * Recursively generates template data based on sections derived from props
 * @param sections: A list of TemplateSectionData objects
 * @returns a list of GoJS object data to include in the custom template
 */
function getSectionStyles(sections: TemplateSectionData[]): go.ObjectData[] {
  return sections.map((section: TemplateSectionData) =>
    $(
      go.Panel,
      section.panelType,
      setColor("background", section.background),
      section.mainPanel ? { isPanelMain: section.mainPanel } : {},
      section.minSize ? { minSize: new go.Size(section.minSize.x, section.minSize.y) } : {},
      section.desiredSize
        ? { desiredSize: new go.Size(section.desiredSize.x, section.desiredSize.y) }
        : {},
      section.height ? { height: section.height } : {},
      section.width ? { width: section.width } : {},
      section.stretch ? { stretch: go.GraphObject.Fill } : {},
      section.shape ? getShapeStyle(section.shape) : {},
      section.text ? getTextBlockStyle(section.text) : {},
      section.sections ? getSectionStyles(section.sections) : {},
      section.padding ? $(go.Placeholder, { padding: section.padding }) : {}
    )
  );
}

/**
 * Generates template's shape object based on shape property derived from props' template
 * @param shape: A TemplateShape object
 * @returns GoJS object data to include in the custom template
 */
function getShapeStyle(shape: TemplateShape): go.Shape {
  return $(
    go.Shape,
    {
      figure: shape.shapeType ?? "None",
      strokeWidth: shape.strokeWidth ?? 0,
    },
    shape.toArrow ? { toArrow: shape.toArrow } : {},
    setColor("stroke", shape.stroke, "black"),
    // fill could either be a hex value or an attribute of `nodes` to bind to
    setColor("fill", shape.fill)
  );
}

/**
 * Generates template's textBlock object based on text property derived from props' template
 * @param text: A TemplateTextBlock object
 * @returns GoJS object data to include in the custom template
 */
function getTextBlockStyle(text: TemplateTextBlock): go.TextBlock {
  return $(
    go.TextBlock,
    {
      textAlign: text.align ?? "center",
      verticalAlignment: go.Spot.Center,
      alignment: go.Spot.Center,
      overflow: text.overflow ?? go.TextBlock.OverflowEllipsis,
      maxLines: text.maxLines ?? 1,
      font: text.font ?? "",
    },
    text.segmentOffset
      ? { segmentOffset: new go.Point(text.segmentOffset.x, text.segmentOffset.y) }
      : {},
    text.stretch ? { stretch: go.GraphObject.Fill } : {},
    text.margin ? { margin: go.Margin.parse(text.margin) } : {},
    setColor("stroke", text.stroke, "black"),
    new go.Binding("text", text.label)
  );
}

/**
 * Generates template's shadow object based on shadow property derived from props
 * @param shadow: A TemplateShadowData object
 * @returns GoJS object data to include in the custom template
 */
function getShadowStyle(shadow: TemplateShadowData): go.ObjectData {
  return {
    isShadowed: true,
    shadowOffset: new go.Point(shadow.shadowOffset.x, shadow.shadowOffset.y),
    shadowBlur: shadow.shadowBlur,
    shadowColor: shadow.shadowColor,
  };
}

/**
 * Checks whether string is a valid color (e.g. "white" or "#FFFFFF")
 * @param strColor string to check
 * @returns true if strColor is a valid color
 */
const isColor = (strColor: string): boolean => {
  const s = new Option().style;
  s.color = strColor;
  return s.color !== "";
};

/**
 * Returns an object to define the color given a prop.
 * @param targetProp The property of the target element to set.
 * @param sourceProp The property of the source data to bind to the {@code targetProp}, or a static
 *     value to assign to {@code targetProp} in all cases.
 * @param defaultValue The value to assign to {@code targetProp} if {@code sourceProp} is undefined.
 *     If a default is not specified, it will default to a garish magenta to indicate missing data.
 * @returns A mapping or binding for {@code targetProp}.
 */
function setColor(
  targetProp: string,
  sourcePropOrColor?: string,
  defaultValue: string = "#FF00FF"
): go.Binding | { [key: string]: string } {
  return sourcePropOrColor
    ? isColor(sourcePropOrColor)
      ? { [targetProp]: sourcePropOrColor }
      : new go.Binding(targetProp, sourcePropOrColor)
    : { [targetProp]: defaultValue };
}
