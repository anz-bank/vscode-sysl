export interface DiagramData {
  type?: { [key: string]: any };
  nodes: Node[];
  edges: Edge[];
  templates?: TemplateData;
  selected?: go.ObjectData;
  skipsDiagramUpdate?: boolean;
  resetsDiagram?: boolean;
}

export interface Node {
  key?: string;
  label?: string;
  category?: string;
  group?: string;
  isGroup?: boolean;
  data?: { [key: string]: any };
}

export interface Edge {
  key?: string;
  from?: string;
  to?: string;
  category?: string;
}
export interface TemplateData {
  diagramLabel: string;
  diagramLayout?: any;
  nodes?: { [key: string]: TemplateNodeData };
  groups?: { [key: string]: TemplateGroupData };
  edges?: { [key: string]: TemplateEdgeData };
}

export interface TemplateNodeData {
  shadow?: TemplateShadowData;
  sections?: TemplateSectionData[];
}

export interface TemplateGroupData {
  shadow?: TemplateShadowData;
  expanded?: TemplateSectionData[];
  collapsed?: TemplateSectionData[];
}

export interface TemplateEdgeData {
  corner?: number;
  pathShape?: TemplateShape;
  arrowShape?: TemplateShape;
  text?: TemplateTextBlock;
}

export interface TemplateShadowData {
  shadowOffset: { [key: string]: number };
  shadowBlur: number;
  shadowColor: string;
}

export interface TemplateSectionData {
  panelType: string;
  desiredSize?: { [key: string]: number };
  background?: string;
  mainPanel?: boolean;
  height?: number;
  padding?: number;
  stretch?: boolean;
  minSize?: { [key: string]: number };
  width?: number;
  shape?: TemplateShape;
  text?: TemplateTextBlock;
  sections?: TemplateSectionData[];
}
export interface TemplateShape {
  shapeType?: string;
  fill?: string;
  strokeWidth?: number;
  stroke?: string;
  toArrow?: string;
}

export interface TemplateTextBlock {
  align?: "start" | "end" | "left" | "right" | "center";
  font?: string;
  label: string;
  margin?: string;
  stroke?: string;
  stretch?: boolean;
  segmentOffset?: { [key: string]: number };
  overflow?: go.EnumValue;
  maxLines?: number;
}
