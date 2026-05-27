"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserMe } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if the user already has a valid session via the custom cookie-based auth
    getUserMe()
      .then(() => router.replace("/"))
      .catch(() => {}) // Not logged in — stay on this page
      .finally(() => setChecking(false))
  }, [router]);

  if (checking) return null;

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Sign in to PillPal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your medications with voice and caregiver support.
          </p>
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/api/auth/login";
            }}
            className="inline-flex items-center justify-center rounded-md bg-black text-white px-4 py-2 hover:opacity-90"
          >
            Continue with Auth0
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/api/auth/login?screen_hint=signup";
            }}
            className="inline-flex items-center justify-center rounded-md border px-4 py-2"
          >
            Create account
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          By continuing you agree to our Terms and acknowledge our Privacy Policy.
        </p>
      </div>
    </main>
  );
}
