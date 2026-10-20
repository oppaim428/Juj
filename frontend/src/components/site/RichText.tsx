/** Plain text with blank-line paragraphs and "## " headings. */
export function RichText({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-4 leading-relaxed" data-testid="rich-text">
      {blocks.map((b, i) =>
        b.startsWith("## ") ? (
          <h2 key={i} className="pt-2 font-display text-xl font-bold">{b.slice(3)}</h2>
        ) : (
          <p key={i} className="whitespace-pre-line text-muted-foreground">{b}</p>
        ),
      )}
    </div>
  );
}
