/** Trivial interface for logging messages about requests and responses. */
export interface Logger {
  log(message?: any, ...optionalParams: any[]): void;
}

export const defaultLogger: Logger = console;
