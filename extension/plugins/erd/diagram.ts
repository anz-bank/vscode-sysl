import { each } from "lodash";
import { DiagramModel, DiagramObjectData } from "../../views/diagram/model";

export async function buildModel(module: any): Promise<DiagramModel> {
  const nodes: DiagramObjectData[] = [];
  const edges: DiagramObjectData[] = [];
  const groups: boolean = Object.keys(module.apps).length > 1;

  each(module.apps, (app, appName) => {
    let includeApp: boolean = false;
    each(app.types, (typ, name) => {
      const key = `${appName}.${name}`;

      nodes.push({
        key,
        label: name,
        group: groups ? appName : undefined,
        isGroup: false,
      });
      includeApp = groups;

      const attrs = typ.tuple?.attrDefs ?? typ.relation?.attrDefs;
      each(attrs, ({ typeRef }) => {
        if (typeRef) {
          const to = [typeRef.appname?.part.join(" :: ") ?? appName, ...typeRef.ref.path].join(".");
          edges.push({ key: `${key}->${to}`, from: key, to });
        }
      });
    });

    if (includeApp) {
      nodes.unshift({ key: appName, label: appName, isGroup: true });
    }
  });

  return { nodes, edges };
}
