import { Model } from "@anz-bank/sysl/model";
import "jest-extended";
import { ProtocolNotificationType0 } from "vscode-languageserver";
import {
  defaultModelManagerConfig,
  ModelDidChangeNotification,
  ModelDidChangeParams,
  ModelDidCloseNotification,
  ModelDidCloseParams,
  ModelDidOpenNotification,
  ModelDidOpenParams,
  ModelManager,
} from "./models";

class FakeConnection {
  private listeners: { [key: string]: (params: any) => void } = {};
  onNotification(type: ProtocolNotificationType0<any>, callback: (event: any) => any): void {
    this.listeners[type.method] = callback;
  }
  acceptModelOpen(params: ModelDidOpenParams): void {
    this.listeners[ModelDidOpenNotification.type.method](params);
  }
  acceptModelChange(params: ModelDidChangeParams): void {
    this.listeners[ModelDidChangeNotification.type.method](params);
  }
  acceptModelClose(params: ModelDidCloseParams): void {
    this.listeners[ModelDidCloseNotification.type.method](params);
  }
}

describe("ModelManager", () => {
  let mm: ModelManager<Model>;
  let conn: FakeConnection = new FakeConnection();

  beforeEach(() => {
    mm = new ModelManager(defaultModelManagerConfig);
    mm.listen(conn as any);
  });

  describe("open", () => {
    test("valid", () => {
      const key = "foo";
      conn.acceptModelOpen({ key, model: "{}" });

      expect(mm.get(key)).toMatchObject({ apps: [] });
    });

    test("invalid", () => {
      const key = "foo";
      conn.acceptModelOpen({ key, model: "invalid" });

      expect(mm.get(key)).toBeUndefined();
    });
  });

  describe("change", () => {
    test("valid", () => {
      const key = "foo";
      conn.acceptModelChange({ key, modelChanges: ["{}"] });

      expect(mm.get(key)).toMatchObject({ apps: [] });
    });

    test("invalid", () => {
      const key = "foo";
      conn.acceptModelChange({ key, modelChanges: ["invalid"] });

      expect(mm.get(key)).toBeUndefined();
    });
  });

  test("close", () => {
    const key = "foo";
    conn.acceptModelClose({ key });

    expect(mm.get(key)).toBeUndefined();
  });

  test("keys", () => {
    expect(mm.keys()).toBeEmpty();

    const key = "foo";
    conn.acceptModelOpen({ key, model: "{}" });

    expect(mm.keys()).toEqual([key]);
  });

  test("all", () => {
    expect(mm.all()).toBeEmpty();

    const key = "foo";
    conn.acceptModelOpen({ key, model: "{}" });

    expect(mm.all()).toMatchObject([{ apps: [] }]);
  });
});
