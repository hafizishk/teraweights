import Link from "next/link";
import { formatDate } from "@/lib/format";
import { postExcerpt } from "@/lib/rules/post-body";
import type { Role } from "@/lib/types";

export type Post = {
  id: string;
  slug: string;
  title: string;
  body: string;
  audience: "all" | "east" | "west" | "prime";
  publishedAt: string;
  authorName: string | null;
  authorRole: Role | null;
};

function roleLabel(role: Role | null, audience: Post["audience"]): string {
  const where = audience === "all" ? "" : ` · ${audience === "prime" ? "PRIME" : audience === "east" ? "East" : "West"}`;
  if (role === "coach") return `Coach${where}`;
  return `Teraweights${where}`;
}

/**
 * A word from the coach, set like a pull quote: a red rule down the left,
 * the byline small, the headline big. No photo; the words are the point.
 */
export function CoachPost({ post }: { post: Post }) {
  const author = post.authorName ?? "Teraweights";
  return (
    <article className="rule pt-4">
      <div className="flex flex-col gap-2 border-l-2 border-brand pl-3">
        <p className="eyebrow">
          {author} · {roleLabel(post.authorRole, post.audience)} · {formatDate(post.publishedAt)}
        </p>
        <h2 className="text-[24px] leading-[1]">{post.title}</h2>
        <p className="text-[15px] leading-relaxed text-paper/85">{postExcerpt(post.body, 200)}</p>
        <Link href={`/app/community/${post.slug}`} className="display w-fit text-lg text-brand">
          Read on the feed →
        </Link>
      </div>
    </article>
  );
}
