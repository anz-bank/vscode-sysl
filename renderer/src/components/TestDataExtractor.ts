import { Diagram, Iterator } from "gojs";

/** A DOM element containing a GoJS diagram. */
interface DiagramElement extends Element {
    goDiagram: Diagram;
}

/** A fake implementation of the {@code vscode} API for dev server development. */
class FakeVSCode {
    postMessage(msg: any): void {
        console.warn("fake vscode cannot postMessage:", msg);
    }
}

//@ts-ignore
const vscode = "acquireVsCodeApi" in window ? acquireVsCodeApi() : new FakeVSCode();

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

    switch (event.data.type) {
        case test_getDiagramData:
            vscode.postMessage({
                type: test_getDiagramData,
                diagram: getDiagramData(),
            });
            break;
        case test_getDiagramScreenshot:
            //@ts-ignore
            vscode.postMessage({
                type: test_getDiagramScreenshot,
                diagram: getScreenshot(),
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
    return {
        nodes: toArray(diagram.nodes).map((i) => i.data),
        edges: toArray(diagram.links).map((i) => i.data),
    };
}

/** Takes a screenshot of the diagram and returns it. */
function getScreenshot(): string | undefined {
    const diagram = getDiagram();
    if (!diagram) {
        return undefined;
    }
    return diagram.makeSvg().outerHTML;
}

function getDiagram(): Diagram | undefined {
    const el = document.querySelector(".diagram-component") as DiagramElement | null;
    if (!el || !el.goDiagram) {
        return undefined;
    }
    return el.goDiagram;
}

/** Converts a GoJS iterator to a regular array. */
function toArray<T>(it: Iterator<T>): T[] {
    const arr: T[] = [];
    while (it.next()) {
        arr.push(it.value);
    }
    return arr;
}
