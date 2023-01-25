/**
 * The configuration settings contributed by the Sysl extension.
 */
export interface SyslConfiguration {
  tool?: {
    binaryPath?: string;
    autoupdate?: boolean;
  };
  plugins?: {
    fetchFromNetwork?: boolean;
    networkSource?: string;
  };
  network?: {
    strictSsl?: boolean;
  };
}
