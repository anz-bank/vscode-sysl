import { render, screen } from "@testing-library/react";
import { Simulate } from "react-dom/test-utils";
import "@testing-library/jest-dom";
import { act } from "react-dom/test-utils";
import { Diagram, Size, Part } from "gojs";
import { vscode } from "./components/vscode/VsCode";

import App from "./App";

const key = { docUri: "file:///test.sysl", pluginId: "test", viewId: "test" };

describe("App test", () => {
  let diagram: Diagram;
  const basicModelEvent = modelEvent({
    model: {
      nodes: [
        { key: "a", label: "a" },
        { key: "b", label: "b" },
      ],
      edges: [{ key: "a->b", from: "a", to: "b" }],
      meta: {
        kind: "diagram",
        label: "Test Diagram",
        key,
      },
    },
  });

  beforeEach(() => {
    // use Jest's fake timers to ensure Diagram.delayInitialization is called in time.
    jest.useFakeTimers();
    act(() => {
      const { container } = render(<App />);
      window.dispatchEvent(
        modelEvent({
          model: {
            nodes: [],
            edges: [],
            meta: {
              key,
              kind: "diagram",
              label: "Test Diagram",
            },
          },
        })
      );
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

  describe("rendering the app", () => {
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

    it("receives message model with willRender type true", async () => {
      act(() => {
        window.dispatchEvent(
          modelEvent({
            model: {
              nodes: [],
              edges: [],
              meta: {
                key,
                kind: "diagram",
                label: "Test Diagram",
              },
              type: { willRender: true },
            },
          })
        );
      });
      // expect loading spinner  to be visible
      expect(screen.getByTestId("loading-spinner")).toBeVisible();
    });

    it.skip("renders an HTML document in a separate tab", async () => {
      const content = "test html content";
      act(() => {
        window.dispatchEvent(
          modelEvent({
            model: {
              meta: { key: { ...key, viewId: "html" }, kind: "html", label: "html tab" },
              content,
            },
          })
        );
      });
      expect(screen.getAllByRole("tab").length).toEqual(2);
      screen.getByText("html tab").click();
      expect(screen.getByTestId("html_view")).toBeVisible();
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
      expect(screen.getByTestId("error-icon")).toBeVisible();
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
          modelEvent({
            model: {
              a: [],
              b: [],
              meta: {
                key,
                kind: "diagram",
                label: "Test Diagram",
              },
            },
          })
        );
      });
      // expect diagram to not have been updated
      expect(diagram.nodes.count).toEqual(2);
      expect(diagram.links.count).toEqual(1);
      // expect error snackbar to be visible
      expect(screen.getByTestId("error-icon")).toBeVisible();
      expect(screen.getByTestId("error-snackbar")).toBeVisible();
    });
  });

  describe("checking visibility", () => {
    beforeEach(() => {
      act(() => {
        window.dispatchEvent(basicModelEvent);
      });
    });

    it("toggle visibility in the tree shows/hides node in the diagram", async () => {
      const elem = screen.queryByTestId("a-vis")!;
      expect((diagram.findNodeForKey("a") as go.Part).visible).toEqual(true);
      Simulate.click(elem);
      expect((diagram.findNodeForKey("a") as go.Part).visible).toEqual(false);
      Simulate.click(elem);
      expect((diagram.findNodeForKey("a") as go.Part).visible).toEqual(true);
    });

    it("Icon with Visibility On is hidden by default", async () => {
      const elem = screen.queryByTestId("a-vis-on-icon")!;
      expect(elem.getAttribute("visibility")).toEqual("hidden");
    });

    it("Icon with Visibility On is shown on mouse hover", async () => {
      const elem = screen.queryByTestId("a-vis-on-icon")!;
      Simulate.mouseOver(elem);
      expect(elem.getAttribute("visibility")).not.toEqual("hidden");
    });

    it("Icon with Visibility Off is always visible", async () => {
      const elem = screen.queryByTestId("a-vis")!;

      expect((diagram.findNodeForKey("a") as go.Part).visible).toEqual(true);
      Simulate.click(elem);

      const visOffIcon = screen.queryByTestId("a-vis-off-icon")!;

      expect(visOffIcon).not.toEqual("hidden");
    });

    it("postMessage to extension on changing visibility", async () => {
      act(() => {
        window.dispatchEvent(basicModelEvent);
        vscode.postMessage = jest.fn();
      });
      const elem = screen.queryByTestId("a-vis")!;
      Simulate.click(elem);
      expect(vscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "view/visibilityChanged",
          current: expect.arrayContaining([{ key: "a", label: "a", visible: false }]),
          previous: expect.arrayContaining([{ key: "a", label: "a" }]),
        })
      );
    });
  });

  describe("selection event", () => {
    beforeEach(() => {
      vscode.postMessage = jest.fn();
      act(() => {
        window.dispatchEvent(basicModelEvent);
      });
      const nodeAPart = diagram.findNodeForKey("a") as Part;
      const linkPart = diagram.findLinkForKey("a->b") as Part;
      diagram.selectCollection([nodeAPart, linkPart]); // multiple selection
    });

    it("postMessage to extension on selection", async () => {
      expect(vscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "select",
          selectedData: {
            current: expect.objectContaining({
              nodes: [expect.objectContaining({ key: "a", label: "a" })],
              edges: [{ key: "a->b", from: "a", to: "b", groups: [], visible: true }],
            }),
            previous: null,
          },
        })
      );
    });

    it("selection details visible on right panel", async () => {
      expect(screen.queryByTestId("selected_a")).not.toBeNull();
      expect(screen.queryByTestId("selected_a->b")).not.toBeNull();
    });

    it("selecting entire link group when an edge is selected", async () => {
      act(() => {
        window.dispatchEvent(
          modelEvent({
            model: {
              nodes: [
                { key: "a", label: "a" },
                { key: "b", label: "b" },
                { key: "c", label: "c" },
              ],
              edges: [
                { key: "a->b", from: "a", to: "b", group: "a->c" },
                { key: "b->c", from: "b", to: "c", group: "a->c" },
                { key: "c->a", from: "c", to: "a" },
              ],
              meta: {
                kind: "diagram",
                label: "Test Diagram",
                key,
              },
            },
          })
        );
      });
      const linkPart = diagram.findLinkForKey("a->b") as Part;
      diagram.select(linkPart);
      expect(screen.queryByTestId("selected_a->b")).not.toBeNull();
      expect(screen.queryByTestId("selected_b->c")).not.toBeNull();
      expect(screen.queryByTestId("selected_c->a")).toBeNull();
    });
  });

  describe("component tree", () => {
    beforeEach(() => {
      act(() => {
        window.dispatchEvent(basicModelEvent);
      });
    });

    it("diagram hierarchy displays nodes", async () => {
      expect(screen.queryByTestId("a")).not.toBeNull();
      expect(screen.queryByTestId("b")).not.toBeNull();
    });

    it("selected node in diagram is selected in tree", async () => {
      const nodeBPart = diagram.findNodeForKey("b") as Part;
      expect(ancestorHasClass(screen.queryByTestId("b"), "Mui-selected")).toBeFalsy();
      diagram.select(nodeBPart);
      expect(ancestorHasClass(screen.queryByTestId("b"), "Mui-selected")).toBeTruthy();
    });

    it("selected node in tree is selected in diagram", async () => {
      const elem = screen.queryByTestId("a")!;
      expect(ancestorHasClass(elem, "Mui-selected")).toBeFalsy();
      Simulate.click(elem);
      expect(ancestorHasClass(elem, "Mui-selected")).toBeTruthy();
      const nodeAPart = diagram.findNodeForKey("a") as Part;
      expect(diagram.selection.has(nodeAPart)).toBe(true);
    });
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
      ...model,
      error,
    },
  });
}

/** Returns true if element or any of its ancestors contains the given class name. */
function ancestorHasClass(element: HTMLElement | null, targetClassName: string): Boolean {
  if (!element) {
    return false;
  }
  if (element.classList.contains(targetClassName)) {
    return true;
  }
  return ancestorHasClass(element.parentElement, targetClassName);
}
