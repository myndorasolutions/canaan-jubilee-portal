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

export default function Header() {
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
    <header className="sticky top-0 z-40 bg-navy text-white shadow-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/canaan-logo.png"
            alt="Canaan Ministries dove logo"
            width={3468}
            height={3138}
            priority
            className="brand-logo shrink-0"
          />
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight text-white sm:text-2xl">
              Canaan Jubilee Auction Portal
            </p>
            <p className="mt-1 text-base leading-snug text-white">
              Canaan Ministries (a.k.a. Champions&apos; Church) — Annual
              Jubilee Auction Ticket Booking
            </p>
          </div>
        </div>
        <nav
          className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:shrink-0"
          aria-label="Quick access"
        >
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setOpen(true);
            }}
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-5 text-base font-bold text-navy"
          >
            Check My Booking
          </button>
          <Link
            href="/admin"
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-champions px-5 text-base font-bold text-white"
          >
            Admin / Staff Login
          </Link>
        </nav>
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
    </header>
  );
}
