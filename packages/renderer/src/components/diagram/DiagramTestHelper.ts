import { Diagram } from "gojs";
import { diagramToData } from "./DiagramUtil";
import { vscode } from "../vscode/VsCode";

/** A DOM element containing a GoJS diagram. */
interface DiagramElement extends Element {
  goDiagram: Diagram;
}

/**
 * Responds to requests from tests to fetch the diagram data.
 *
 * This is an unfortunate hack that shouldn't exist in production, but appears to be necessary to
 * exfiltrate view data from the GoJS diagram to the VS Code extension test framework.
 *
 * This function will only work in a VS Code webview context where {@code acquireVsCodeApi} is
 * defined.
 */
export function handleTestDataRequest(event: MessageEvent): void {
  const test_getDiagramData = "__test__gojs";
  const test_getDiagramScreenshot = "__test__gojs_svg";
  const test_selectTab = "__test__selectTab";

  switch (event.data.type) {
    case test_getDiagramData:
      vscode.postMessage({
        type: test_getDiagramData,
        diagram: getDiagramData(),
      });
      break;
    case test_getDiagramScreenshot:
      vscode.postMessage({
        type: test_getDiagramScreenshot,
        diagram: getScreenshot(),
      });
      break;
    case test_selectTab:
      vscode.postMessage({
        type: test_selectTab,
        status: selectTab(event.data.label),
      });
      break;
    default:
      return;
  }
}

/** Fetches and returns the data populating the diagram. */
function getDiagramData(): { nodes: any[]; edges: any[] } | undefined {
  const diagram = getDiagram();
  if (!diagram) {
    return undefined;
  }
  return diagramToData(diagram);
}

/** Takes a screenshot of the diagram and returns it. */
function getScreenshot(): string | undefined {
  const diagram = getDiagram();
  if (!diagram) {
    return undefined;
  }
  return diagram.makeSvg()?.outerHTML;
}

/** Selects a view tab by label. */
function selectTab(label: string): boolean {
  const el = Array.from(document.querySelectorAll("[role=tab]")).find(
    (el) => el.textContent === label
  ) as HTMLElement;
  if (el) {
    el.click();
    return true;
  }
  return false;
}

function getDiagram(): Diagram | undefined {
  const el = document.querySelector(".diagram-component") as DiagramElement | null;
  if (!el || !el.goDiagram) {
    return undefined;
  }
  return el.goDiagram;
}
