import type { SitePageBlock } from "@/types/centre-site";
import DonationBlock from "@/components/centre-site/donation-block";

/**
 * Renders the validated content blocks of a centre website page.
 * Text is rendered as literal text (never as HTML). The only block that
 * injects raw HTML is `embed_html` — a deliberate capability for trusted
 * centre IT staff (e.g. Google Forms), matching "the centre owns its site".
 */
export default function BlockRenderer({
  blocks,
  centreCode,
}: {
  blocks: SitePageBlock[];
  centreCode?: string;
}) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return (
      <p className="text-gray-400 text-sm">This page has no content yet.</p>
    );
  }

  return (
    <div className="space-y-6">
      {blocks.map((block) => {
        switch (block.type) {
          case "heading":
            const level = block.data.level;
            const cls = "text-gray-900 font-semibold leading-tight";
            if (level === 1) return <h1 key={block.id} className={`${cls} text-4xl`}>{block.data.text}</h1>;
            if (level === 2) return <h2 key={block.id} className={`${cls} text-2xl`}>{block.data.text}</h2>;
            return <h3 key={block.id} className={`${cls} text-xl`}>{block.data.text}</h3>;

          case "paragraph":
            return <p key={block.id} className="text-base leading-7 text-gray-700 whitespace-pre-wrap">{block.data.text}</p>;

          case "image":
            return (
              <figure key={block.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={block.data.src}
                  alt={block.data.alt ?? ""}
                  className="w-full max-h-[28rem] object-cover rounded-lg"
                />
                {block.data.caption ? (
                  <figcaption className="mt-2 text-sm text-gray-500">{block.data.caption}</figcaption>
                ) : null}
              </figure>
            );

          case "button":
            return (
              <a
                key={block.id}
                href={block.data.href}
                target={block.data.href.startsWith("http") ? "_blank" : undefined}
                rel={block.data.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="inline-block rounded-md px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
              >
                {block.data.label}
              </a>
            );

          case "list":
            if (block.data.ordered === true) {
              return (
                <ol key={block.id} className="list-decimal pl-6 space-y-1 text-gray-700">
                  {block.data.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ol>
              );
            }
            return (
              <ul key={block.id} className="list-disc pl-6 space-y-1 text-gray-700">
                {block.data.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            );

          case "quote":
            return (
              <blockquote key={block.id} className="border-l-4 pl-4 italic text-gray-700">
                <p className="text-lg">{block.data.text}</p>
                {block.data.attribution ? (
                  <p className="mt-2 text-sm not-italic text-gray-500">— {block.data.attribution}</p>
                ) : null}
              </blockquote>
            );

          case "divider":
            return <hr key={block.id} className="border-gray-200" />;

          case "video":
            return (
              <div key={block.id} className="aspect-video">
                <iframe
                  src={block.data.url}
                  title="Centre video"
                  className="w-full h-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            );

          case "embed_html":
            return (
              <div
                key={block.id}
                // Raw trusted embed (centre IT staff only — see validation).
                dangerouslySetInnerHTML={{ __html: block.data.html }}
              />
            );

          case "donation":
            if (!centreCode) return null;
            return <DonationBlock key={block.id} centreCode={centreCode} block={block} />;

          default:
            return null;
        }
      })}
    </div>
  );
}