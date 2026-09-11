import { parsePostBody } from "@/lib/rules/post-body";

/** Renders a post body through the one shared parser (lib/rules/post-body.ts). */
export function PostBody({ body }: { body: string }) {
  const blocks = parsePostBody(body);
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) =>
        b.kind === "heading" ? (
          <h2 key={i} className="mt-2 text-[22px] leading-none">
            {b.text}
          </h2>
        ) : (
          <p key={i} className="text-[16px] leading-relaxed text-paper/90">
            {b.text}
          </p>
        ),
      )}
    </div>
  );
}
