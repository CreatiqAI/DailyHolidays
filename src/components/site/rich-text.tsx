import { Fragment, type ReactNode } from "react";

/** Minimal markdown: ## headings, - lists, **bold**, paragraphs. Enough for tour descriptions. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

export function RichText({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="space-y-4 text-navy-700">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (!lines.length) return null;
        if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*•]\s+/, ""))}</li>)}
            </ul>
          );
        }
        const h = lines[0].match(/^#{1,4}\s+(.*)/);
        if (h && lines.length === 1) {
          return <h3 key={i} className="pt-2 text-lg font-semibold text-navy-900">{inline(h[1])}</h3>;
        }
        return (
          <p key={i} className="whitespace-pre-line leading-relaxed">
            {inline(lines.map((l) => l.replace(/^#{1,4}\s+/, "")).join("\n"))}
          </p>
        );
      })}
    </div>
  );
}
