declare const acquireVsCodeApi: Function;

export interface VSCode {
  postMessage(msg: any): void;
  getState(): any;
  setState(state: any): void;
}

/** A fake implementation of the {@code vscode} API for dev server development. */
export class FakeVSCode implements VSCode {
  private state: any;

  postMessage(msg: any): void {
    console.warn("fake vscode cannot postMessage:", msg);
  }

  getState(): any {
    return this.state;
  }

  setState(state: any): void {
    this.state = state;
  }
}

// acquireVsCodeApi can only be called once.
export const vscode: VSCode = "acquireVsCodeApi" in window ? acquireVsCodeApi() : new FakeVSCode();
