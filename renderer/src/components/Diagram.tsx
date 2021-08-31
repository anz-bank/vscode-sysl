import React from "react";
import { ReactDiagram } from "gojs-react";
import DiagramTemplate from "./DiagramTemplates";
import { Node, Edge, TemplateData } from "./DiagramTypes";

interface DiagramProps {
  template?: TemplateData;
  diagramKey: string;
  nodes: Node[];
  edges: Edge[];
}

export default function Diagram({ template, diagramKey, nodes, edges }: DiagramProps) {
  // not rendering when data updates !!!
  const renderer = () => DiagramTemplate(template);

  const handleModelChange = () => {
    console.log("model changed");
  };

  return (
    <ReactDiagram
      key={diagramKey}
      divClassName="diagram-component"
      initDiagram={renderer}
      nodeDataArray={nodes}
      linkDataArray={edges}
      onModelChange={handleModelChange}
      skipsDiagramUpdate={false}
    />
  );
}
