export enum TransportKind {
  stdio = 0,
  ipc = 1,
  pipe = 2,
  socket = 3,
}

export type ServerOptions = {};
export type LanguageClientOptions = {};

export class LanguageClient {
  constructor(
    id: string,
    name: string,
    serverOptions: ServerOptions,
    clientOptions: LanguageClientOptions,
    forceDebug?: boolean
  ) {}

  registerFeatures(features: any[]) {}
  registerFeature(feature: any) {}
}
