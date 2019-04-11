export interface IWorkspaceSettings {
    root: string;
}

export interface IToolSettings {
    parser: string;
    tempOutput: string;
}

export interface ISyslSettings {
    tool: IToolSettings;
    workspace: IWorkspaceSettings;
}

export interface ISettings {
    sysl: ISyslSettings;
}

export interface ISyslConfigChangeListener {
    onChange(config: ISettings): void;
}

export class SyslConfigProvider implements ISettings {
    // private workspaceRoot: string;
    // tslint:disable-next-line:member-access
    sysl = {
      tool: {
        parser: "",
        tempOutput: "",
      },
      workspace: {
        root: ".",
      },
    };

    private listeners: ISyslConfigChangeListener[];

    constructor() {
      this.listeners = [];
    }

    public setWorkspaceRoot(root: string) {
      this.sysl.workspace.root = root;
    }

    public setGoSysl(path: string) {
      this.sysl.tool.parser = path;
    }

    public update() {
      for (const o of this.listeners) {
        o.onChange(this);
      }
    }

    public getRoot() {
      return this.sysl.workspace.root;
    }
    public register(o: ISyslConfigChangeListener) {
      this.listeners.push(o);
    }
}
