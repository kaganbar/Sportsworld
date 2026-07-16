import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";

// useLang() falls back to LangContext's default value (Hebrew/RTL) when no
// <LanguageProvider> wraps the tree — this app's actual default for every
// real user, so testing arrow-key direction against it (rather than forcing
// English) exercises the behavior that matters most.

function ThreeTabs() {
  return (
    <Tabs defaultValue="a">
      <TabsList>
        <TabsTrigger value="a">Tab A</TabsTrigger>
        <TabsTrigger value="b">Tab B</TabsTrigger>
        <TabsTrigger value="c">Tab C</TabsTrigger>
      </TabsList>
      <TabsContent value="a">Panel A</TabsContent>
      <TabsContent value="b">Panel B</TabsContent>
      <TabsContent value="c">Panel C</TabsContent>
    </Tabs>
  );
}

describe("Tabs keyboard navigation", () => {
  it("gives only the active tab a 0 tabIndex (roving tabindex)", () => {
    render(<ThreeTabs />);
    expect(screen.getByRole("tab", { name: "Tab A" })).toHaveAttribute("tabIndex", "0");
    expect(screen.getByRole("tab", { name: "Tab B" })).toHaveAttribute("tabIndex", "-1");
    expect(screen.getByRole("tab", { name: "Tab C" })).toHaveAttribute("tabIndex", "-1");
  });

  it("ArrowLeft moves to and activates the next tab under the default RTL context", () => {
    render(<ThreeTabs />);
    screen.getByRole("tab", { name: "Tab A" }).focus();

    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowLeft" });

    expect(screen.getByRole("tab", { name: "Tab B" })).toHaveFocus();
    expect(screen.getByText("Panel B")).toBeInTheDocument();
  });

  it("ArrowRight moves to the previous tab (with wraparound) under RTL", () => {
    render(<ThreeTabs />);
    screen.getByRole("tab", { name: "Tab A" }).focus();

    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });

    expect(screen.getByRole("tab", { name: "Tab C" })).toHaveFocus();
    expect(screen.getByText("Panel C")).toBeInTheDocument();
  });

  it("End jumps to the last tab, Home jumps back to the first", () => {
    render(<ThreeTabs />);
    screen.getByRole("tab", { name: "Tab A" }).focus();

    fireEvent.keyDown(screen.getByRole("tablist"), { key: "End" });
    expect(screen.getByRole("tab", { name: "Tab C" })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("tablist"), { key: "Home" });
    expect(screen.getByRole("tab", { name: "Tab A" })).toHaveFocus();
  });
});
