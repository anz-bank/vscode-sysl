import Handsontable from "opentable";
import { ViewModel } from "../views/types";

export type CellModel = string | { value: any; [key: string]: any };

export interface TableModel extends ViewModel {
  data: CellModel[][];
  settings?: Handsontable.DefaultSettings;
  [key: string]: any;
}

export type Change = {
  row: number;
  prop: string | number;
  oldValue: any;
  newValue: any;
};
