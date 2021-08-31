import { act } from "react-dom/test-utils";
import { render } from "@testing-library/react";
import { Diagram, Size } from "gojs";

import App from "./App";

describe("rendering the app", () => {
  let diagram: Diagram;

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
      window.dispatchEvent(
        modelEvent([
          {
            nodes: [
              { key: "a", label: "a" },
              { key: "b", label: "b" },
            ],
            edges: [{ key: "a->b", from: "a", to: "b" }],
          },
        ])
      );
    });
    expect(diagram.nodes.count).toEqual(2);
    expect(diagram.links.count).toEqual(1);
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
function modelEvent(model: any) {
  return new MessageEvent("message", {
    data: {
      type: "render",
      model,
    },
  });
}
