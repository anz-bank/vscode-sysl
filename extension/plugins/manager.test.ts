import { expect } from "chai";
import { PluginManager } from "./manager";

suite("plugins", () => {
  suite("manager", () => {
    test("exists", async () => {
      expect(new PluginManager()).to.be.not.null;
    });
  });
});
