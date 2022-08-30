import { format } from "@anz-bank/sysl/common";
import { Call, IElement, Model } from "@anz-bank/sysl/model";
import { DiagramModel, DiagramObjectData } from "../../views/diagram/model";

const notIgnored = (el: IElement) => !el.tags.some((t) => t.value === "ignore");

export async function buildModel(model: Model): Promise<DiagramModel> {
  const apps = model.apps
    .filter((app) => app.types.length || app.endpoints.some((e) => e.name !== "..."))
    .filter(notIgnored);

  const nodes: DiagramObjectData[] = apps.map((app) => {
    const appName = format.joinedAppName(app.name.parts);
    return {
      key: appName,
      label: appName,
      isGroup: false,
    };
  });

  const edges: DiagramObjectData[] = apps.flatMap((app) =>
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
  );

  return {
    nodes,
    edges,
    templates: { diagramLayout: "LayeredDigraphLayout" },
  };
}
