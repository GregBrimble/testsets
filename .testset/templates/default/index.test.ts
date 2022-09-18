import myLib from "my-lib";
import { describe, it, expect } from "vitest";

// Write your test here!

describe("myLib", () => {
  it("adds correctly", () => {
    expect(myLib.add(2, 2)).toEqual(4);
  });
});
