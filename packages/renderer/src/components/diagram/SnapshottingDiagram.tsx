import * as React from "react";
import * as go from "gojs";
import { vscode } from "../vscode/VsCode";

interface ParentMessageEvent {
  data: {
    type: string;
  };
}

/** A DOM element containing a GoJS diagram. */
interface DiagramElement extends Element {
  goDiagram: go.Diagram;
}

/** Takes a screenshot of the diagram and returns it. */
function getScreenshot(): string | undefined {
  const diagram = getDiagram();
  if (!diagram) {
    return undefined;
  }
  return diagram.makeSvg()?.outerHTML;
}

function getDiagram(): go.Diagram | undefined {
  const el = document.querySelector(".diagram-component") as DiagramElement | null;
  if (!el || !el.goDiagram) {
    return undefined;
  }
  return el.goDiagram;
}

/** Props to configure the snapshotter. */
interface SnapshotProps {
  active?: boolean;
  name?: string;
}

/** Handles snapshot events for child diagrams. */
export class DiagramSnapshotter extends React.Component<SnapshotProps, {}> {
  constructor(props: SnapshotProps) {
    super(props);

    this.handleSnapshot = this.handleSnapshot.bind(this);
  }

  private handleSnapshot(event: ParentMessageEvent) {
    if (this.props.active !== false && event.data.type === "view/snapshot") {
      vscode.postMessage({
        type: "view/snapshot",
        data: getScreenshot(),
        name: this.props.name,
      });
    }
  }

  public componentDidMount() {
    window.addEventListener("message", this.handleSnapshot);
  }

  public componentWillUnmount() {
    window.removeEventListener("message", this.handleSnapshot);
  }

  render() {
    return this.props.children;
  }
}
