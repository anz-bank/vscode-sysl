import { Model, Reference, Type, TypeDecorator, TypeValue } from "@anz-bank/sysl/model";
import { DiagramModel, DiagramObjectData } from "../../views/diagram/model";

export async function buildModel(model: Model): Promise<DiagramModel> {
  const nodes: DiagramObjectData[] = [];
  const edges: DiagramObjectData[] = [];
  const groups: boolean = Object.keys(model.apps).length > 1;

  model.apps.forEach((app) => {
    let includeApp = false;
    const appName = app.name.toSysl();
    app.types.forEach((type) => {
      const key = `${appName}.${type.name}`;

      nodes.push({
        key,
        label: type.name,
        group: groups ? appName : undefined,
        isGroup: false,
      });
      includeApp = groups;

      getChildReferences(type).forEach((ref: Reference) => {
        const to = ref.appName ? ref.toSysl() : `${appName}.${ref.typeName}`;
        edges.push({ key: `${key}->${to}`, from: key, to });
      });
    });
    if (includeApp) {
      nodes.unshift({ key: appName, label: appName, isGroup: true });
    }
  });

  return { nodes, edges };
}

function getChildReferences(type: Type): Reference[] {
  return type
    .children()
    .map((f) => f.value)
    .map(getReference)
    .filter(isReference);
}

function isReference(value: TypeValue | undefined): value is Reference {
  return value?.constructor.name === Reference.name;
}

function getReference(value: TypeValue): Reference | undefined {
  if (!value) {
    return undefined;
  }
  if (isReference(value)) {
    return value;
  }
  if (value.constructor.name === TypeDecorator.name) {
    return getReference((value as TypeDecorator<any>).innerType);
  }
  return undefined;
}
