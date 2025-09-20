"use client";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useSpeech } from "@/hooks/useSpeech";

export default function Home() {
  const { user } = useUser();
  const { status, transcript, startListening, stopListening, speak } = useSpeech();

  return (
    <div className="min-h-screen p-8 sm:p-12 font-[family-name:var(--font-geist-sans)]">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-semibold">PillPal</h1>
        <nav className="flex gap-4">
          {user ? (
            <Link href="/api/auth/logout" className="underline">
              Logout
            </Link>
          ) : (
            <Link href="/api/auth/login" className="underline">
              Login
            </Link>
          )}
        </nav>
      </header>

      <main className="mt-10 grid gap-6">
        <section className="rounded-xl border p-6">
          <h2 className="text-xl font-medium mb-3">Voice</h2>
          <div className="flex gap-3 items-center">
            <button
              onClick={startListening}
              className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
              disabled={status === 'listening'}
            >
              {status === 'listening' ? 'Listening…' : 'Start'}
            </button>
            <button onClick={stopListening} className="rounded border px-4 py-2">
              Stop
            </button>
            <button
              onClick={() => speak('You asked: ' + (transcript || 'nothing yet'))}
              className="rounded border px-4 py-2"
            >
              Speak Back
            </button>
          </div>
          <p className="mt-4 text-lg">{transcript || 'Say: What do I take now?'}</p>
        </section>
      </main>
    </div>
  );
}
