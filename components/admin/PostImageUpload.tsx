"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/ui/Toaster";
import { createClient } from "@/lib/supabase/client";

const MAX_EDGE = 1600;

/** Downscale to 1600px on the longest edge and re-encode as JPEG, in the browser. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.85),
  );
}

/**
 * Uploads post photos straight to the `posts` bucket from the admin's browser
 * (RLS limits writes to admins). Paths are date-prefixed and randomised so the
 * bucket stays browsable by day and no name can be guessed. Photos from the
 * camera roll are compressed first: a 6 MB phone photo becomes a few hundred KB.
 */
export function PostImageUpload({
  label,
  multiple = false,
  onUploaded,
}: {
  label: string;
  multiple?: boolean;
  onUploaded: (urls: string[]) => void;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const day = new Date().toISOString().slice(0, 10);
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 12)) {
        const blob = await shrink(file);
        const path = `${day}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error } = await supabase.storage.from("posts").upload(path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        urls.push(supabase.storage.from("posts").getPublicUrl(path).data.publicUrl);
      }
      onUploaded(urls);
    } catch {
      toast.show("Could not upload. Try a JPG or PNG under 10 MB.", "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="inline-flex h-8 items-center rounded-md border border-ink-3 px-3 text-xs text-paper hover:border-muted disabled:opacity-50"
      >
        {busy ? "Uploading…" : label}
      </button>
    </>
  );
}
