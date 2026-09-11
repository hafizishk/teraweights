import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/onboarding";
import { getPostBySlug, CATEGORY_LABELS } from "@/lib/queries/posts";
import { DuotonePhoto } from "@/components/member/DuotonePhoto";
import { PostBody } from "@/components/member/PostBody";
import { formatDate } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const post = await getPostBySlug(supabase, slug);
  return { title: post?.title ?? "Post" };
}

/** One post: cover, byline, body, then the gallery if there is one. */
export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await requireOnboarded(supabase, user!.id);

  const post = await getPostBySlug(supabase, slug);
  if (!post) notFound();

  const who = post.author_name ?? "Teraweights";
  const when = formatDate(post.published_at ?? post.created_at);

  return (
    <article className="flex flex-col gap-5">
      {post.cover_url ? (
        <div className="-mx-4 -mt-4">
          <DuotonePhoto src={post.cover_url} fadeTo="ink" priority className="h-[300px]">
            <div className="flex h-full flex-col justify-end gap-1.5 px-4 pb-4">
              <p className="eyebrow text-paper/80">
                {CATEGORY_LABELS[post.category]} · {who} · {when}
              </p>
              <h1 className="text-[34px] leading-[0.95]">{post.title}</h1>
            </div>
          </DuotonePhoto>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="eyebrow">
            {CATEGORY_LABELS[post.category]} · {who} · {when}
          </p>
          <h1 className="text-[34px] leading-[0.95]">{post.title}</h1>
        </div>
      )}

      <PostBody body={post.body} />

      {post.images.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="eyebrow">Photos</h2>
          <ul className="-mx-4 grid grid-cols-2 gap-1">
            {post.images.map((url) => (
              <li key={url}>
                <DuotonePhoto src={url} fadeTo="none" className="aspect-square" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Link href="/app/community" className="rule pt-4 text-sm text-muted underline underline-offset-4">
        Back to the feed
      </Link>
    </article>
  );
}
