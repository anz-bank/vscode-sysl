import { cloneDeep, omit } from "lodash";
import { HotTable } from "opentable-react";
import { useEffect } from "react";
import { Change, TableModel } from "./TableModel";

export interface TableViewProps {
  model: TableModel;
  onChange: (delta: Change[], source: string) => void;
}

export default function TableView({ model, onChange }: TableViewProps) {
  useEffect(() => {
    window.addEventListener("resize", resizeHotTable);
  });

  function afterChange(changes: HotTableChange[], source: string) {
    changes && onChange(changes.map(toChange), source);
  }

  return (
    <HotTable
      // Data will be mutated internally on change, so make a copy of the read-only data.
      data={cloneDeep(model.data)}
      colHeaders={true}
      rowHeaders={true}
      // Fixed height to make scrollbars work properly, with hack to change on window resize.
      // TODO: Figure out how to resize more naturally.
      height={800}
      style={{ overflow: "hidden" }}
      {...omit(model.settings, "className")}
      beforeChange={afterChange}
    />
  );
}

/** The content of a change event emitted by a {@link HotTable}. */
type HotTableChange = [number, string | number, any, any];

/**
 * Creates a {@link Change} from an array of row, prop, oldValue, newValue.
 */
function toChange([row, prop, oldValue, newValue]: HotTableChange): Change {
  return { row, prop, oldValue, newValue };
}

/**
 * Hack to allow for resizing the otherwise fixed-size table when the window resizes.
 * Still requires a redraw which happens on scroll.
 */
function resizeHotTable() {
  const hotSelector = ".handsontable.htRowHeaders.htColumnHeaders";
  const hot = document.querySelector(hotSelector) as HTMLElement;
  const topBarHeight = document.querySelector(".MuiAppBar-root")?.clientHeight ?? 0;
  const style = hot?.style ?? {};
  style.height = `${document.body.clientHeight - topBarHeight - 10}px`;
}
