import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SimpleMarkdown from "./simple-markdown";

describe("SimpleMarkdown", () => {
  it("renders a level-2 heading", () => {
    render(<SimpleMarkdown text="## My Read: Dodgers vs. Astros" />);
    expect(screen.getByRole("heading", { level: 2, name: "My Read: Dodgers vs. Astros" })).toBeInTheDocument();
  });

  it("renders a level-3 heading distinctly from level-2", () => {
    render(<SimpleMarkdown text="### The verdict" />);
    expect(screen.getByRole("heading", { level: 3, name: "The verdict" })).toBeInTheDocument();
  });

  it("renders bold spans inside a paragraph", () => {
    render(<SimpleMarkdown text="Both models agree on **Houston** as the favorite." />);
    const strong = screen.getByText("Houston");
    expect(strong.tagName).toBe("STRONG");
  });

  it("groups consecutive bullet lines into one list", () => {
    render(<SimpleMarkdown text={"- First point\n- Second point\n- Third point"} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[1]).toHaveTextContent("Second point");
  });

  it("renders bold text within a bullet item", () => {
    render(<SimpleMarkdown text="- **Cached analysis:** Astros 51% / Dodgers 49%" />);
    expect(screen.getByText("Cached analysis:").tagName).toBe("STRONG");
  });

  it("separates blank-line-delimited paragraphs", () => {
    render(<SimpleMarkdown text={"First paragraph.\n\nSecond paragraph."} />);
    const paragraphs = screen.getAllByText(/paragraph\./);
    expect(paragraphs).toHaveLength(2);
  });

  it("starts a new list after a heading interrupts a previous list", () => {
    render(<SimpleMarkdown text={"- Item one\n\n## Heading\n\n- Item two"} />);
    const lists = document.querySelectorAll("ul");
    expect(lists).toHaveLength(2);
  });
});
