"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { BookingSlip } from "@/components/BookingSlip";
import {
  findHouseholdBooking,
  markWhatsappInitiated,
  usePublicCatalog,
  type HouseholdBooking,
} from "@/lib/catalogStore";

const steps = [
  {
    number: "1",
    text: "Register Household & Book Items Online",
  },
  {
    number: "2",
    text: "Confirm via WhatsApp within 72 Hours",
  },
  {
    number: "3",
    text: "Get Accredited & Pay/Collect Physical Tickets at the Church Desk",
  },
];

export default function Footer() {
  const { settings } = usePublicCatalog();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<HouseholdBooking | "missing" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setResult("missing");
      return;
    }
    const booking = await findHouseholdBooking(trimmed);
    setResult(booking ?? "missing");
  }

  return (
    <footer>
      <section className="bg-navy text-white" aria-label="How booking works">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
          <h2 className="text-2xl font-bold sm:text-3xl">Three simple steps</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <li
                key={step.number}
                className="rounded-2xl bg-white/10 p-5"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-champions text-xl font-bold text-white">
                  {step.number}
                </span>
                <p className="mt-4 text-lg font-bold leading-snug">
                  Step {step.number}: {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <div className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col items-start gap-4 rounded-2xl border-2 border-myndora bg-white px-4 py-4 shadow-sm sm:w-auto sm:flex-row sm:items-center">
            <Image
              src="/myndora-logo.png"
              alt="Myndora Solutions"
              width={1520}
              height={332}
              className="myndora-logo"
            />
            <p className="text-lg font-bold leading-snug text-navy">
              Powered by Myndora Solutions Ltd.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3">
            <p className="text-base font-semibold text-navy">
              Canaan Ministries (a.k.a. Champions&apos; Church)
            </p>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setOpen(true);
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-navy px-5 text-base font-bold text-white"
            >
              Check My Booking
            </button>
            <Link href="/admin" className="text-base font-semibold text-navy">
              © 2026
            </Link>
          </div>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 text-navy shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={titleId} className="text-2xl font-bold">
              Check My Booking
            </h2>
            <p className="mt-2 text-lg leading-relaxed">
              Enter the phone number or booking reference for your household.
            </p>
            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
              <label className="block text-base font-bold" htmlFor="booking-lookup">
                Phone number or booking reference
              </label>
              <input
                ref={inputRef}
                id="booking-lookup"
                name="booking-lookup"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoComplete="tel"
                className="min-h-12 w-full rounded-lg border-2 border-navy bg-white px-4 text-lg text-navy"
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg bg-champions px-5 text-base font-bold text-white"
                >
                  Check
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg border-2 border-navy bg-white px-5 text-base font-bold text-navy"
                >
                  Close
                </button>
              </div>
            </form>
            {result === "missing" ? (
              <p
                className="mt-4 rounded-lg bg-slate-100 p-4 text-lg font-semibold"
                role="status"
              >
                {query.trim()
                  ? "No booking is on file for that detail yet."
                  : "Please enter the phone number or booking reference for your household."}
              </p>
            ) : result ? (
              <BookingSlip
                booking={result}
                settings={settings}
                onWhatsapp={(booking) => {
                  const next = markWhatsappInitiated(booking.id);
                  setResult(next ?? { ...booking, whatsappInitiated: true });
                }}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </footer>
  );
}
