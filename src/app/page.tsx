"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { grantRegistrationConsent } from "@/lib/consent";

export default function Home() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  function proceed() {
    if (!agreed) return;
    grantRegistrationConsent();
    router.push("/register");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-white">
          <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
            <p className="text-base font-bold tracking-wide text-champions uppercase">
              Canaan Ministries
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-navy sm:text-5xl">
              Welcome to the Canaan Jubilee Auction Portal
            </h1>
            <p className="mt-4 text-xl leading-relaxed text-navy">
              Canaan Ministries (a.k.a. Champions&apos; Church) uses this portal
              for household registration and Jubilee ticket booking. Please read
              the guidelines below before you register.
            </p>
            <label className="mt-8 flex items-start gap-3 rounded-2xl border-2 border-navy/15 bg-slate-50 p-5 text-lg leading-relaxed text-navy">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-1 h-6 w-6 shrink-0 accent-navy"
              />
              <span>
                I have read and agree to the{" "}
                <Link href="/privacy" className="font-bold text-champions underline">
                  Privacy Policy
                </Link>
                {", "}
                <Link href="/terms" className="font-bold text-champions underline">
                  Terms of Service
                </Link>
                {", and "}
                <Link href="/disclaimer" className="font-bold text-champions underline">
                  Event Disclaimer
                </Link>.
              </span>
            </label>
            <button
              type="button"
              onClick={proceed}
              disabled={!agreed}
              className="mt-6 inline-flex min-h-14 w-full items-center justify-center rounded-lg bg-emerald px-5 text-lg font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 sm:w-auto"
            >
              Proceed to Register
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
