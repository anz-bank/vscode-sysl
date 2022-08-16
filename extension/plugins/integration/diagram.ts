import { format } from "@anz-bank/sysl/common";
import { Call, Model } from "@anz-bank/sysl/model";
import { DiagramModel, DiagramObjectData } from "../../views/diagram/model";

export async function buildModel(model: Model): Promise<DiagramModel> {
  const groups: boolean = false; // Object.keys(model.apps).length > 1;

  const nodes: DiagramObjectData[] = model.apps.map((app) => {
    const appName = format.joinedAppName(app.name.parts);
    return {
      key: appName,
      label: appName,
      group: groups ? appName : undefined,
      isGroup: false,
    };
  });
  const edges: DiagramObjectData[] = model.apps.flatMap((app) =>
    app.endpoints.flatMap((ep) =>
      ep.statements
        .filter((s) => s.value?.constructor.name === Call.name)
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
    templates: {
      diagramLabel: "Integration",
      diagramLayout: "ForceDirectedLayout",
    },
  };
}
