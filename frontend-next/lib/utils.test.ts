import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins plain class strings", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("resolves conflicting Tailwind utility classes, keeping the last one", () => {
    // tailwind-merge's whole job: two conflicting padding utilities collapse
    // to just the later one, unlike a plain string join which would keep both.
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("applies conditional classes from an object form", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });
});
