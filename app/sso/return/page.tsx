"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function SsoReturnContent() {
  const router = useRouter();
  const params = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const rawUser = params.get("user");
    const destination = params.get("destination") || "/helpdesk/employee/dashboard";

    if (!accessToken || !refreshToken) {
      window.location.href = "/helpdesk/employee/login?error=sso_error";
      return;
    }

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    if (rawUser) {
      try {
        localStorage.setItem("user", rawUser);
      } catch {
        // Ignore malformed user payload; the API will still authenticate.
      }
    }

    window.dispatchEvent(new Event("userUpdated"));

    // Scrub tokens from the URL before navigating to the dashboard.
    window.history.replaceState(null, "", destination);
    router.replace(destination);
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        <p className="text-sm text-zinc-500">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function SsoReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500">Completing sign in...</p>
        </div>
      }
    >
      <SsoReturnContent />
    </Suspense>
  );
}