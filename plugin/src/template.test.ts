import "jest-extended";
import { Plugin } from "./template";

describe("Plugin", () => {
  test("constructor", () => {
    expect(new Plugin({})).not.toBeNull();
  });
});
