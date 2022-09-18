import { add } from "my-lib";
import { describe, it, expect } from "vitest";

describe("add", () => {
  it("should add some numbers together", () => {
    expect(add(1, 2)).toEqual(3);
  });
});
