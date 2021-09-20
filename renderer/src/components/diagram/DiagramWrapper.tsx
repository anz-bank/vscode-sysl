import * as React from "react";
import * as go from "gojs";
import { ReactDiagram } from "gojs-react";

import "./Diagram.css";
import DiagramTemplate from "./DiagramTemplates";
import { TemplateData } from "./DiagramTypes";

export interface DiagramProps {
  nodes: Array<go.ObjectData>;
  edges: Array<go.ObjectData>;
  templates?: TemplateData;
  skipsDiagramUpdate: boolean;
  diagramKey: string;
  onDiagramEvent: (e: go.DiagramEvent) => void;
  onModelChange: (e: go.IncrementalData) => void;
}

export class DiagramWrapper extends React.Component<DiagramProps, {}> {
  /**
   * Ref to keep a reference to the Diagram component, which provides access to the GoJS diagram via getDiagram().
   */
  private diagramRef: React.RefObject<ReactDiagram>;

  /** @internal */
  constructor(props: DiagramProps) {
    super(props);
    this.diagramRef = React.createRef();
  }

  /**
   * Get the diagram reference and add any desired diagram listeners.
   * Typically the same function will be used for each listener, with the function using a switch statement to handle the events.
   */
  public componentDidMount() {
    if (!this.diagramRef.current) return;
    const diagram = this.diagramRef.current.getDiagram();
    if (diagram instanceof go.Diagram) {
      diagram.addDiagramListener("ChangedSelection", this.props.onDiagramEvent);
    }
  }

  /**
   * Get the diagram reference and remove listeners that were added during mounting.
   */
  public componentWillUnmount() {
    if (!this.diagramRef.current) return;
    const diagram = this.diagramRef.current.getDiagram();
    if (diagram instanceof go.Diagram) {
      diagram.removeDiagramListener("ChangedSelection", this.props.onDiagramEvent);
    }
  }

  public render() {
    return (
      <ReactDiagram
        key={this.props.diagramKey}
        ref={this.diagramRef}
        divClassName="diagram-component"
        initDiagram={() => DiagramTemplate(this.props?.templates)}
        nodeDataArray={this.props.nodes}
        linkDataArray={this.props.edges}
        onModelChange={this.props.onModelChange}
        skipsDiagramUpdate={this.props.skipsDiagramUpdate}
      />
    );
  }
}
