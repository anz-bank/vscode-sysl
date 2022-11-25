import { format } from "@anz-bank/sysl/common";
import { Call, Element, Model } from "@anz-bank/sysl/model";
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
        ep.statements
          .filter((s) => s.value?.constructor.name === Call.name)
          .filter(notIgnored)
          .map((s) => s.value as Call)
          .map((call) => {
            const from = format.joinedAppName(call.originApp);
            const to = format.joinedAppName(call.targetApp);
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
