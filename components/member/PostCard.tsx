import Link from "next/link";
import { DuotonePhoto } from "@/components/member/DuotonePhoto";
import { CATEGORY_LABELS, type PostRow } from "@/lib/queries/posts";
import { postExcerpt } from "@/lib/rules/post-body";
import { formatDate } from "@/lib/format";

function byline(p: PostRow): string {
  const who = p.author_name ?? "Teraweights";
  const where = p.audience === "all" ? "" : ` · ${p.audience === "prime" ? "PRIME" : p.audience === "east" ? "East" : "West"}`;
  return `${who}${where} · ${formatDate(p.published_at ?? p.created_at)}`;
}

/**
 * One post in the feed. With a cover it is a photo with the title set over the
 * fade; without one it is a ruled text row. Both tap through to the post.
 */
export function PostCard({ post, priority = false }: { post: PostRow; priority?: boolean }) {
  const href = `/app/community/${post.slug}`;
  const label = CATEGORY_LABELS[post.category];

  if (post.cover_url) {
    return (
      <Link href={href} className="-mx-4 block">
        <DuotonePhoto src={post.cover_url} fadeTo="ink" priority={priority} className="h-[240px]">
          <div className="flex h-full flex-col justify-end gap-1.5 px-4 pb-4">
            <p className="eyebrow text-paper/80">
              {label} · {byline(post)}
            </p>
            <h2 className="text-[30px] leading-[0.95]">{post.title}</h2>
            {post.images.length > 0 ? <p className="text-xs text-paper/70">{post.images.length + 1} photos</p> : null}
          </div>
        </DuotonePhoto>
      </Link>
    );
  }

  return (
    <Link href={href} className="rule flex flex-col gap-1.5 py-4">
      <p className="eyebrow">
        {label} · {byline(post)}
      </p>
      <h2 className="text-[24px] leading-[1]">{post.title}</h2>
      <p className="text-[15px] leading-relaxed text-paper/80">{postExcerpt(post.body)}</p>
    </Link>
  );
}
