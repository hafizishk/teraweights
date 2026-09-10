"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const EXPIRED = "That sign-in link has expired or was already used. Request a new one.";

export function FinishSignIn() {
  const router = useRouter();
  const [status, setStatus] = useState("Signing you in…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const description = params.get("error_description");

    function fail(message: string) {
      router.replace(`/login?error=${encodeURIComponent(message)}`);
    }

    if (description) {
      fail(description.replace(/\+/g, " "));
      return;
    }

    if (!accessToken || !refreshToken) {
      fail(EXPIRED);
      return;
    }

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          fail(error.message);
          return;
        }
        setStatus("Done. Taking you in…");
        // Full navigation so the server sees the freshly written session cookie.
        window.location.replace("/app");
      })
      .catch(() => fail(EXPIRED));
  }, [router]);

  return (
    <p role="status" className="text-sm text-muted">
      {status}
    </p>
  );
}
