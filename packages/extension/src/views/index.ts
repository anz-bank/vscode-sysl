import { ViewRegistry } from "./registry";
import { Views } from "./types";

// TODO: Don't export this, do everything through the public Views API.
export const viewRegistry: ViewRegistry = new ViewRegistry();

/** The public API for view management. */
export const views: Views = viewRegistry;
