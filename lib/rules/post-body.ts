/**
 * Post body format (community feed). Plain text in the database, parsed into
 * blocks at render time. Deliberately a small subset that survives being
 * written by a non-technical admin:
 *
 *   blank line          → paragraph break
 *   "#" to "####" line  → heading
 *   "**"                → stripped, never rendered as bold
 *
 * One parser for the feed, the post page and Home, so they can never drift.
 */

export type PostBlock = { kind: "heading"; text: string } | { kind: "paragraph"; text: string };

export function parsePostBody(body: string): PostBlock[] {
  const blocks: PostBlock[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };

  for (const raw of body.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.replace(/\*\*/g, "").trim();
    if (line === "") {
      flush();
      continue;
    }
    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", text: heading[1].trim() });
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return blocks;
}

/** The first paragraph, trimmed to about a line and a half, for list cards. */
export function postExcerpt(body: string, max = 120): string {
  const first = parsePostBody(body).find((b) => b.kind === "paragraph");
  if (!first) return "";
  if (first.text.length <= max) return first.text;
  const cut = first.text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 40))}…`;
}
