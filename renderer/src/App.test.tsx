import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { act } from "react-dom/test-utils";
import { Diagram, GraphLinksModel, Size, Part } from "gojs";
import { vscode } from "./components/vscode/VsCode";

import App from "./App";

describe("rendering the app", () => {
  let diagram: Diagram;
  const basicModelEvent = modelEvent([{
    nodes: [
      { key: "a", label: "a" },
      { key: "b", label: "b" },
    ],
    edges: [{ key: "a->b", from: "a", to: "b" }],
  }]);

  beforeEach(() => {
    // use Jest's fake timers to ensure Diagram.delayInitialization is called in time.
    jest.useFakeTimers();
    act(() => {
      const { container } = render(<App />);
      jest.runOnlyPendingTimers();
      diagram = initializeDiagramDom(container);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it("contains a diagram", () => {
    expect(diagram.nodes.count).toEqual(0);
    expect(diagram.links.count).toEqual(0);
  });

  it("receives messages", async () => {
    act(() => {
      window.dispatchEvent(basicModelEvent);
    });
    expect(diagram.nodes.count).toEqual(2);
    expect(diagram.links.count).toEqual(1);
  });

  it("receives an error", async () => {
    act(() => {
      window.dispatchEvent(basicModelEvent);
    });
    expect(diagram.nodes.count).toEqual(2);
    expect(diagram.links.count).toEqual(1);
    act(() => {
      window.dispatchEvent(modelEvent(null, { errorMsg: "an error occurred" }));
    });
    // expect diagram to not have been updated
    expect(diagram.nodes.count).toEqual(2);
    expect(diagram.links.count).toEqual(1);
    // expect error snackbar to be visible
    expect(screen.getByTestId("error-snackbar")).toBeVisible();
  });

  it("receives message with no model", async () => {
    act(() => {
      window.dispatchEvent(basicModelEvent);
    });
    expect(diagram.nodes.count).toEqual(2);
    expect(diagram.links.count).toEqual(1);
    act(() => {
      window.dispatchEvent(modelEvent(null));
    });
    // expect diagram to not have been updated
    expect(diagram.nodes.count).toEqual(2);
    expect(diagram.links.count).toEqual(1);
    // expect error snackbar to be visible
    expect(screen.getByTestId("error-snackbar")).toBeVisible();
  });

  it("receives message model with no nodes or edges", async () => {
    act(() => {
      window.dispatchEvent(basicModelEvent);
    });
    expect(diagram.nodes.count).toEqual(2);
    expect(diagram.links.count).toEqual(1);
    act(() => {
      window.dispatchEvent(
        modelEvent([
          {
            a: [],
            b: [],
          },
        ])
      );
    });
    // expect diagram to not have been updated
    expect(diagram.nodes.count).toEqual(2);
    expect(diagram.links.count).toEqual(1);
    // expect error snackbar to be visible
    expect(screen.getByTestId("error-snackbar")).toBeVisible();
  });
});

describe("selection event", () => {
  let diagram: Diagram;
  const basicModelEvent = modelEvent([{
    nodes: [
      { key: "a", label: "a" },
      { key: "b", label: "b" },
    ],
    edges: [{ key: "a->b", from: "a", to: "b" }],
  }]);

  beforeEach(() => {
    // use Jest's fake timers to ensure Diagram.delayInitialization is called in time.
    jest.useFakeTimers();
    act(() => {
      const { container } = render(<App />);
      jest.runOnlyPendingTimers();
      diagram = initializeDiagramDom(container);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it("postMessage to extension on selection", async () => {
    act(() => {
      window.dispatchEvent(basicModelEvent);
    });
    vscode.postMessage = jest.fn();
    const nodeAPart = diagram.findNodeForKey('a') as Part;
    const linkPart = diagram.findLinkForKey('a->b') as Part;
    diagram.selectCollection([nodeAPart, linkPart]); // multiple selection
    expect(vscode.postMessage).toHaveBeenCalledWith(
      {
        type: "select",
        selectedData: {
          current: {
            nodes: [ { key: "a", label: "a" }],
            edges: [{ key: "a->b", from: "a", to: "b" }]
          },
          previous: null
        }
      }
    );
  });

});

/** Tweak the DOM to make the diagram rendering consistent during tests. */
function initializeDiagramDom(container: Element): Diagram {
  const diagram: Diagram = (container.querySelector(".diagram-component") as any).goDiagram;

  // disable animation for testing,
  // jsdom has no layout by default, so we have to set a viewSize
  diagram.commit((d) => {
    d.animationManager.stopAnimation();
    d.animationManager.isEnabled = false;
    d.viewSize = new Size(400, 400);
  });

  // jsdom has no layout by default, so we have to add width/height manually
  Object.defineProperty(diagram.div, "clientWidth", { configurable: true, value: 400 });
  Object.defineProperty(diagram.div, "clientHeight", { configurable: true, value: 400 });
  diagram.animationManager.stopAnimation();
  diagram.maybeUpdate(); // will trigger a resize with the new width/height

  return diagram;
}

/** Construct a render message to update the app model. */
function modelEvent(model: any, error?: any) {
  return new MessageEvent("message", {
    data: {
      type: "render",
      model,
      error,
    },
  });
}
