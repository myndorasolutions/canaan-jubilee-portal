"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { FormEvent, useState } from "react";
import { loginAdmin } from "@/lib/adminAuth";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const ok = await loginAdmin(password);
    setPending(false);
    if (!ok) setError("That password is not correct.");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-slate-100 px-4 py-10">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-navy bg-white shadow-lg"
      >
        <div className="flex flex-col items-center bg-navy px-6 py-6 text-center text-white">
          <Image
            src="/canaan-logo.png"
            alt="Canaan Ministries dove logo"
            width={3468}
            height={3138}
            priority
            className="brand-logo"
          />
          <h1 className="mt-3 text-2xl font-bold leading-tight">
            Canaan Jubilee Admin & Accreditation Login
          </h1>
        </div>
        <div className="space-y-4 px-6 py-6">
          <label className="block text-base font-bold text-navy" htmlFor="admin-password">
            Admin password
          </label>
          <div className="flex gap-2">
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg text-navy"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-navy text-navy"
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
          {error ? (
            <p className="rounded-lg bg-slate-100 p-3 text-base font-semibold text-navy" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-champions px-5 text-base font-bold text-white disabled:bg-slate-400"
          >
            {pending ? "Checking…" : "Login to Admin Portal"}
          </button>
          <Link
            href="/"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border-2 border-navy px-5 text-base font-bold text-navy"
          >
            ← Back to public portal
          </Link>
        </div>
      </form>
    </main>
  );
}
