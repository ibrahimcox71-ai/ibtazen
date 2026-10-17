/**
 * Constrained Markdown subset for blog bodies — the only renderer of
 * `/blog/[slug]` article content (Phase 25). Deliberately small: headings,
 * paragraphs, ordered/unordered lists, blockquotes, fenced code and
 * horizontal rules, with `**bold**`, `*italic*`, `` `code` `` and
 * `[label](href)` inline.
 *
 * Raw HTML is never accepted: every text run is returned as data and
 * rendered as React text (auto-escaped), so a stored `<script>` stays
 * visible text instead of executing. Links are restricted to relative paths,
 * `http(s)` and `mailto:` — `javascript:` and friends are dropped to plain
 * text by `safeHref`.
 */

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "em"; children: InlineNode[] }
  | { type: "code"; value: string }
  | { type: "link"; href: string; children: InlineNode[] };

export type BlogBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; id: string; children: InlineNode[] }
  | { type: "paragraph"; children: InlineNode[] }
  | { type: "list"; ordered: boolean; items: InlineNode[][] }
  | { type: "quote"; children: InlineNode[] }
  | { type: "code"; language: string; code: string }
  | { type: "hr" };

const HEADING = /^(#{1,6})\s+(.*)$/;
const UNORDERED = /^[-*+]\s+(.*)$/;
const ORDERED = /^\d+[.)]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const FENCE = /^```([\w+-]*)\s*$/;
const RULE = /^(?:-{3,}|\*{3,}|_{3,})\s*$/;

/**
 * Accept only relative site paths and well-known absolute schemes. Anything
 * else (notably `javascript:`) returns `null` and the caller keeps the text.
 */
export function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (!href) return null;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (/^(https?:\/\/|mailto:)/i.test(href)) return href;
  return null;
}

/** `parseInline("a **b** [c](/d)")` → nested text/strong/link nodes. */
export function parseInline(src: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let buffer = "";
  let i = 0;

  const flush = () => {
    if (buffer) {
      nodes.push({ type: "text", value: buffer });
      buffer = "";
    }
  };

  while (i < src.length) {
    // `code span` — no nesting, first closing backtick wins.
    if (src[i] === "`") {
      const end = src.indexOf("`", i + 1);
      if (end > i + 1) {
        flush();
        nodes.push({ type: "code", value: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (src.startsWith("**", i)) {
      const end = src.indexOf("**", i + 2);
      if (end > i + 2) {
        flush();
        nodes.push({ type: "strong", children: parseInline(src.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }
    if (src[i] === "*") {
      // The closing star must be a lone `*` — a `**` pair is strong, not em.
      let end = i + 1;
      while ((end = src.indexOf("*", end)) !== -1) {
        if (src[end - 1] !== "*" && src[end + 1] !== "*") break;
        end += 1;
      }
      if (end > i + 1 && end !== -1) {
        flush();
        nodes.push({ type: "em", children: parseInline(src.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    if (src[i] === "[") {
      const close = src.indexOf("](", i);
      if (close > i && src.startsWith("](", close)) {
        const end = src.indexOf(")", close + 2);
        if (end > close + 2) {
          const href = safeHref(src.slice(close + 2, end));
          if (href) {
            flush();
            nodes.push({
              type: "link",
              href,
              children: parseInline(src.slice(i + 1, close)),
            });
            i = end + 1;
            continue;
          }
        }
      }
    }
    buffer += src[i];
    i += 1;
  }

  flush();
  return nodes;
}

/** Anchor id for a heading — readable, lowercase, URL-safe. */
export function headingAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");
}

function inlineText(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return node.value;
        case "code":
          return node.value;
        case "strong":
        case "em":
        case "link":
          return inlineText(node.children);
      }
    })
    .join("");
}

/**
 * Parse a stored article body into renderable blocks. Blank input and
 * unsupported syntax degrade to plain paragraphs — never to an empty page.
 */
export function parseBlogContent(markdown: string): BlogBlock[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: BlogBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined) break;

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const language = fence[1] ?? "";
      const code: string[] = [];
      i += 1;
      while (i < lines.length) {
        const codeLine = lines[i];
        if (codeLine === undefined || codeLine.startsWith("```")) break;
        code.push(codeLine);
        i += 1;
      }
      i += 1; // closing fence (or end of input)
      blocks.push({ type: "code", language, code: code.join("\n") });
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const hashes = heading[1] ?? "#";
      const level = Math.min(Math.max(hashes.length, 1), 6) as 1 | 2 | 3 | 4 | 5 | 6;
      const text = (heading[2] ?? "").trim();
      const children = parseInline(text);
      blocks.push({ type: "heading", level, id: headingAnchor(inlineText(children)), children });
      i += 1;
      continue;
    }

    if (QUOTE.test(line)) {
      const text: string[] = [];
      while (i < lines.length) {
        const quoteLine = lines[i];
        const match = quoteLine === undefined ? null : QUOTE.exec(quoteLine);
        if (!match) break;
        text.push(match[1] ?? "");
        i += 1;
      }
      blocks.push({ type: "quote", children: parseInline(text.join(" ")) });
      continue;
    }

    const unordered = UNORDERED.exec(line);
    const ordered = ORDERED.exec(line);
    if (unordered || ordered) {
      const isOrdered = Boolean(ordered);
      const matcher = isOrdered ? ORDERED : UNORDERED;
      const items: InlineNode[][] = [];
      let match: RegExpExecArray | null = isOrdered ? ordered : unordered;
      while (match) {
        items.push(parseInline((match[1] ?? "").trim()));
        i += 1;
        const nextLine = lines[i];
        match = nextLine === undefined ? null : matcher.exec(nextLine);
      }
      blocks.push({ type: "list", ordered: isOrdered, items });
      continue;
    }

    // Paragraph: consecutive plain lines, joined the way soft breaks read.
    const paragraph: string[] = [line.trim()];
    i += 1;
    while (i < lines.length) {
      const next = lines[i];
      if (next === undefined || !next.trim()) break;
      if (
        HEADING.test(next) ||
        QUOTE.test(next) ||
        UNORDERED.test(next) ||
        ORDERED.test(next) ||
        RULE.test(next) ||
        FENCE.test(next)
      ) {
        break;
      }
      paragraph.push(next.trim());
      i += 1;
    }
    blocks.push({ type: "paragraph", children: parseInline(paragraph.join(" ")) });
  }

  return blocks;
}

/** Flattened readable text — meta description fallback and RSS summaries. */
export function blogPlainText(markdown: string): string {
  return parseBlogContent(markdown)
    .map((block) => {
      switch (block.type) {
        case "hr":
          return "";
        case "code":
          return block.code;
        case "list":
          return block.items.map(inlineText).join(" ");
        default:
          return inlineText(block.children);
      }
    })
    .filter(Boolean)
    .join(" ");
}

/** Cut on a word boundary so search snippets never read truncated. */
export function clampText(value: string, max = 155): string {
  const flat = value.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}
