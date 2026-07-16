"use client";

import { Fragment } from "react";

// A minimal markdown-lite renderer for Master Agent reports — no
// react-markdown/remark dependency (this environment's npm registry access
// is blocked, confirmed while building this feature: installing any new
// package fails with a TLS trust error from a FortiGate inspection proxy on
// the sandbox's own outbound path, not something fixable from here). Handles
// exactly the subset the Master Agent's own SYSTEM_PROMPT and real observed
// output actually use: `##`/`###` headings, `**bold**` inline spans, `- `
// bullet lists, and blank-line-separated paragraphs. Not a general CommonMark
// parser — deliberately narrow to what this one feature needs.

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>
    ),
  );
}

export default function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: JSX.Element[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="my-2 list-disc space-y-1 ps-5">
        {listItems.map((item, i) => (
          <li key={i}>{renderInline(item, `li-${blocks.length}-${i}`)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={`p-${blocks.length}`} className="my-2 leading-relaxed">
        {renderInline(paragraph.join(" "), `p-${blocks.length}`)}
      </p>,
    );
    paragraph = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{2,4})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      const content = renderInline(headingMatch[2], `h-${blocks.length}`);
      const className = level === 2 ? "mb-2 mt-4 text-lg font-bold text-white" : "mb-2 mt-3 text-base font-semibold text-white";
      blocks.push(
        level === 2 ? (
          <h2 key={`h-${blocks.length}`} className={className}>
            {content}
          </h2>
        ) : (
          <h3 key={`h-${blocks.length}`} className={className}>
            {content}
          </h3>
        ),
      );
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      listItems.push(bulletMatch[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();

  return <div>{blocks}</div>;
}
