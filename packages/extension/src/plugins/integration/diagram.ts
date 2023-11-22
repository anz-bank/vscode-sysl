import { CallStatement, Element, ElementKind, Model } from "@anz-bank/sysl/model";
import { DiagramModel, DiagramObjectData } from "../../views/diagram/model";

const notIgnored = (el: Element) => !el.tags.some((t) => t.name === "ignore");

export async function buildModel(model: Model): Promise<DiagramModel> {
  const apps = model.apps
    .filter((app) => app.types.length || app.endpoints.some((e) => e.name !== "..."))
    .filter(notIgnored);

  const nodes: DiagramObjectData[] = apps.map((app) => {
    const appName = app.toRef().toSysl();
    return {
      key: appName,
      label: app.name,
      isGroup: false,
      group: app.namespace.join(" :: ") || undefined,
    };
  });

  const groups: DiagramObjectData[] = apps
    .filter((app) => app.namespace.length)
    .map((app) => {
      const ns = app.namespace.join(" :: ");
      return {
        key: ns,
        label: ns,
        isGroup: true,
      };
    });

  const edges: DiagramObjectData[] = apps
    .flatMap((app) =>
      app.endpoints.filter(notIgnored).flatMap((ep) =>
        ep.children
          .filter((s) => s instanceof CallStatement)
          .filter(notIgnored)
          .map((s) => s as CallStatement)
          .map((call) => {
            const from = call.sourceApp.toString();
            const to = call.targetEndpoint.truncate(ElementKind.App).toString();
            return { key: `${from}->${to}`, from, to };
          })
      )
    )
    .filter((e) => e.from !== e.to);

  return {
    nodes: [...nodes, ...groups],
    edges,
    // templates: { diagramLayout: "LayeredDigraphLayout" },
  };
}
