import { Avatar } from "@/components/ui/Avatar";
import { DuotonePhoto } from "@/components/member/DuotonePhoto";
import { formatDate } from "@/lib/format";
import { photoForClass } from "@/lib/photos";
import type { ClassSlug, Role } from "@/lib/types";

export type Post = {
  id: string;
  title: string;
  body: string;
  audience: "all" | "east" | "west" | "prime";
  publishedAt: string;
  authorName: string | null;
  authorRole: Role | null;
};

function photoFor(audience: Post["audience"]): string {
  const slug: ClassSlug =
    audience === "west" ? "energise_west" : audience === "prime" ? "prime" : "energise_east";
  return photoForClass(slug);
}

function roleLabel(role: Role | null, audience: Post["audience"]): string {
  const where = audience === "all" ? "" : ` · ${audience === "prime" ? "PRIME" : audience === "east" ? "East" : "West"}`;
  if (role === "coach") return `Coach${where}`;
  return `Teraweights team${where}`;
}

export function CoachPost({ post }: { post: Post }) {
  const author = post.authorName ?? "Teraweights";
  return (
    <article className="overflow-hidden rounded-lg border border-ink-3 bg-ink-2">
      <DuotonePhoto src={photoFor(post.audience)} fadeTo="card" className="h-[150px]" />
      <div className="relative -mt-10 flex flex-col gap-2 px-4 pb-4">
        <div className="flex items-center gap-2.5">
          <Avatar name={author} ring={false} />
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold">{author}</span>
            <span className="text-xs text-muted">
              {roleLabel(post.authorRole, post.audience)} · {formatDate(post.publishedAt)}
            </span>
          </div>
        </div>
        <h2 className="text-[22px] leading-[1.05]">{post.title}</h2>
        <p className="text-sm leading-relaxed text-muted">{post.body}</p>
      </div>
    </article>
  );
}
