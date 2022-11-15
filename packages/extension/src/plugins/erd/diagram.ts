import {
  CollectionDecorator,
  Element,
  ElementRef,
  FieldValue,
  Model,
  Type,
} from "@anz-bank/sysl/model";
import { DiagramModel, DiagramObjectData } from "../../views/diagram/model";

const notIgnored = (el: Element) => !el.tags.some((t) => t.value === "ignore");

export async function buildModel(model: Model): Promise<DiagramModel> {
  const nodes: DiagramObjectData[] = [];
  const edges: DiagramObjectData[] = [];
  const groups: boolean = Object.keys(model.apps).length > 1;

  model.apps.filter(notIgnored).forEach((app) => {
    let includeApp = false;
    const appName = app.toRef().toSysl();
    app.types.filter(notIgnored).forEach((type) => {
      const key = `${appName}.${type.name}`;

      nodes.push({
        key,
        label: type.name,
        group: groups ? appName : undefined,
        isGroup: false,
      });
      includeApp = groups;

      getChildReferences(type).forEach((ref: ElementRef) => {
        const to = ref.appName ? ref.toSysl() : `${appName}.${ref.typeName}`;
        edges.push({ key: `${key}->${to}`, from: key, to });
      });
    });
    if (includeApp) {
      nodes.unshift({ key: appName, label: appName, isGroup: true });
    }
  });

  return { nodes, edges, templates: { diagramLayout: "LayeredDigraphLayout" } };
}

function getChildReferences(type: Type): ElementRef[] {
  return type.children
    .filter(notIgnored)
    .map((f) => f.value)
    .map(getReference)
    .filter(isReference);
}

function isReference(value: FieldValue | undefined): value is ElementRef {
  return value?.constructor.name === ElementRef.name;
}
function isDecorator(value: FieldValue | undefined): value is CollectionDecorator {
  return value?.constructor.name === CollectionDecorator.name;
}

function getReference(value: FieldValue): ElementRef | undefined {
  if (!value) return undefined;
  if (isReference(value)) return value;
  if (isDecorator(value)) return getReference(value.innerType as FieldValue);
  return undefined;
}
