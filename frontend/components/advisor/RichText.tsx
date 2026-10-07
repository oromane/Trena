/**
 * Rendu minimal des réponses du conseiller : paragraphes, puces « - », **gras**.
 * Sans hook : utilisable côté serveur (carte du dashboard) et client.
 */
export default function RichText({ text }: { text: string }) {
  const inline = (s: string, k: number) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={`${k}-${i}`} className="font-semibold text-ats-text">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={`${k}-${i}`}>{part}</span>
      )
    );
  return (
    <>
      {text.split('\n').map((line, i) => {
        const bullet = /^\s*[-*•]\s+/.test(line);
        if (!line.trim()) return <div key={i} className="h-2" />;
        return bullet ? (
          <p key={i} className="flex gap-2">
            <span className="text-ats-green">•</span>
            <span>{inline(line.replace(/^\s*[-*•]\s+/, ''), i)}</span>
          </p>
        ) : (
          <p key={i}>{inline(line, i)}</p>
        );
      })}
    </>
  );
}
