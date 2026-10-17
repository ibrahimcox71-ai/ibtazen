import type { ReactNode } from "react";
import { parseBlogContent, type InlineNode } from "@/lib/blog/markdown";

/**
 * Renders a stored article body as React elements. Every text run becomes a
 * React child — React escapes it — so the Markdown subset can never inject
 * markup or script into `/blog/[slug]`.
 */

const INLINE_LINK =
  "font-medium text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent";

function renderInline(nodes: InlineNode[]): ReactNode {
  return nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return node.value;
      case "code":
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 rounded border border-border-subtle bg-surface-sunken font-mono text-[0.9em] text-text"
          >
            {node.value}
          </code>
        );
      case "strong":
        return <strong key={index}>{renderInline(node.children)}</strong>;
      case "em":
        return <em key={index}>{renderInline(node.children)}</em>;
      case "link": {
        const external = /^https?:\/\//i.test(node.href);
        return (
          <a
            key={index}
            href={node.href}
            className={INLINE_LINK}
            {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
          >
            {renderInline(node.children)}
          </a>
        );
      }
    }
  });
}

export function BlogContent({ markdown }: { markdown: string }) {
  const blocks = parseBlogContent(markdown);

  return (
    <div className="gap-6 flex flex-col" data-testid="blog-content">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading": {
            // The page already owns the single <h1> — body headings start at h2.
            const level = Math.min(Math.max(block.level, 2), 6);
            const Tag = `h${level}` as "h2" | "h3" | "h4" | "h5" | "h6";
            return (
              <Tag
                key={index}
                id={block.id}
                className="scroll-mt-24 pt-2 font-semibold first:pt-0 [&+p]:mt-0 font-display text-title text-text"
              >
                {renderInline(block.children)}
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p key={index} className="text-base leading-relaxed text-text-secondary">
                {renderInline(block.children)}
              </p>
            );
          case "list": {
            const items = block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="pl-1 text-base leading-relaxed text-text-secondary">
                {renderInline(item)}
              </li>
            ));
            return block.ordered ? (
              <ol key={index} className="gap-2 pl-6 flex list-decimal flex-col marker:text-accent">
                {items}
              </ol>
            ) : (
              <ul key={index} className="gap-2 pl-6 flex list-disc flex-col marker:text-accent">
                {items}
              </ul>
            );
          }
          case "quote":
            return (
              <blockquote
                key={index}
                className="pl-4 text-lg border-l-2 font-display text-title text-text italic"
              >
                {renderInline(block.children)}
              </blockquote>
            );
          case "code":
            return (
              <pre
                key={index}
                className="p-4 overflow-x-auto rounded-xl border border-border-subtle bg-surface-sunken"
              >
                <code className="text-sm font-mono text-text-secondary">
                  {block.language ? (
                    <span className="mb-2 text-xs tracking-wide block text-text-muted uppercase">
                      {block.language}
                    </span>
                  ) : null}
                  {block.code}
                </code>
              </pre>
            );
          case "hr":
            return <hr key={index} className="my-2 border-border-subtle" />;
        }
      })}
    </div>
  );
}
