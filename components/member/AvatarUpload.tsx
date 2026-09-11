"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toaster";
import { createClient } from "@/lib/supabase/client";
import { setAvatar } from "@/lib/actions/profile";

const MAX_EDGE = 512;

/** Downscale to 512px on the longest edge and re-encode as JPEG, in the browser. */
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

type Props = {
  userId: string;
  name: string;
  src: string | null;
  /** Right-aligned identity block for the top of You: photo, name, email. */
  compact?: boolean;
  email?: string | null;
};

export function AvatarUpload({ userId, name, src, compact = false, email }: Props) {
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await shrink(file);
      const supabase = createClient();
      const path = `${userId}/avatar-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const result = await setAvatar(data.publicUrl);
      toast.show(result.ok ? result.message : result.error, result.ok ? "ok" : "error");
      router.refresh();
    } catch {
      toast.show("Could not upload that photo. Try a JPG or PNG under 10 MB.", "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function onRemove() {
    setBusy(true);
    const result = await setAvatar(null);
    toast.show(result.ok ? result.message : result.error, result.ok ? "ok" : "error");
    router.refresh();
    setBusy(false);
  }

  const fileInput = (
    <input ref={input} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
  );

  if (compact) {
    return (
      <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          aria-label={src ? "Change photo" : "Add a photo"}
          className="rounded-full disabled:opacity-50"
        >
          <Avatar name={name} src={src} size={64} ring={false} />
        </button>
        <span className="display text-xl leading-none">{name}</span>
        {email ? <span className="max-w-[200px] truncate text-xs text-muted">{email}</span> : null}
        <span className="flex items-center gap-2 text-xs">
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="text-brand disabled:opacity-50">
            {busy ? "Uploading…" : src ? "Change photo" : "Add a photo"}
          </button>
          {src ? (
            <button type="button" disabled={busy} onClick={onRemove} className="text-muted underline underline-offset-4">
              Remove
            </button>
          ) : null}
        </span>
        {fileInput}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} src={src} size={72} ring={false} />
      <div className="flex flex-col gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="display text-lg text-brand disabled:opacity-50"
        >
          {busy ? "Uploading…" : src ? "Change photo" : "Add a photo"}
        </button>
        {src ? (
          <button type="button" disabled={busy} onClick={onRemove} className="self-start text-xs text-muted underline underline-offset-4">
            Remove
          </button>
        ) : (
          <span className="text-xs text-muted">Optional. Shows where you appear to other Energisers.</span>
        )}
        {fileInput}
      </div>
    </div>
  );
}
