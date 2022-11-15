import { ViewModel } from "../views/types";

export interface HtmlModel extends ViewModel {
  content: string;
  [key: string]: any;
}
