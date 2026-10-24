"use client";

import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import {
  accreditHousehold,
  findCashierBookings,
  formatDeadline,
  formatNaira,
  markTicketsPaidAndIssued,
  ticketReceiptWhatsappUrl,
  type HouseholdBooking,
  type TicketPaymentMethod,
} from "@/lib/catalogStore";

const METHODS: { id: TicketPaymentMethod; label: string }[] = [
  { id: "CASH", label: "Cash" },
  { id: "POS", label: "POS Terminal" },
  { id: "TRANSFER", label: "Bank Transfer" },
];

export function CashierDesk({
  households,
  batches,
}: {
  households: HouseholdBooking[];
  batches: string[];
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<HouseholdBooking[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [method, setMethod] = useState<TicketPaymentMethod>("CASH");
  const [cashierName, setCashierName] = useState("");
  const [notice, setNotice] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanHandled = useRef(false);
  const selected = households.find((booking) => booking.id === selectedId) ?? null;

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    scanHandled.current = false;
    const run = async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const scanner = new Html5Qrcode("cashier-qr-reader");
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "user" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => {
            if (scanHandled.current) return;
            scanHandled.current = true;
            const reference = referenceFromQr(decoded);
            if (!reference) {
              setScanError("That QR code is not a Canaan Jubilee pass.");
              setScanning(false);
              return;
            }
            setQuery(reference);
            const found = findCashierBookings(reference);
            setMatches(found);
            setSelectedId(found.length === 1 ? found[0].id : null);
            setNotice(found.length === 0 ? "No booking matches that pass." : "");
            setScanning(false);
          },
          () => undefined,
        );
      } catch {
        if (!cancelled) {
          setScanError("The camera could not start. Type the code instead.");
          setScanning(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      void closeScanner(scanner);
    };
  }, [scanning]);

  function showMatches(list: HouseholdBooking[]) {
    setMatches(list);
    setSelectedId(list.length === 1 ? list[0].id : null);
    setNotice(list.length === 0 ? "No booking matches that lookup." : "");
  }

  function findFrom(text: string) {
    showMatches(findCashierBookings(text));
  }

  function startScan() {
    setScanError("");
    setScanning(true);
  }

  function cancelScan() {
    setScanning(false);
  }

  function confirmPaid() {
    if (!selected) return;
    const result = markTicketsPaidAndIssued(selected.id, method, cashierName);
    if (!result) {
      setNotice("Only an accredited booking can be issued.");
      return;
    }
    setNotice(
      `#${result.booking.referenceCode} is paid and the physical tickets are issued.`,
    );
  }

  function quickAccredit() {
    if (!selected) return;
    const batch = selected.pickupBatch || batches[0] || "";
    const result = accreditHousehold(
      selected.id,
      batch,
      "Quick accredit from the cashier desk.",
    );
    if (!result) {
      setNotice("This booking could not be accredited.");
      return;
    }
    setNotice(
      `#${result.booking.referenceCode} is accredited. Collect the ticket fee when the buyer is ready.`,
    );
  }

  const receipt = selected ? ticketReceiptWhatsappUrl(selected) : null;

  return (
    <section className="mt-8">
      <h2 className="text-2xl font-bold text-navy">💳 Cashier &amp; Ticket Issuing Desk</h2>
      <p className="mt-2 max-w-3xl text-lg leading-relaxed">
        Look up the booking, match the face, collect the ticket fee, and hand
        over the labeled tickets. The item purchase price is not shown here.
      </p>

      <form
        className="mt-6 rounded-2xl border-2 border-navy bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault();
          findFrom(query);
        }}
      >
        <label className="block text-base font-bold text-navy" htmlFor="cashier-lookup">
          Booking code or WhatsApp number
        </label>
        <input
          id="cashier-lookup"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="4829, #CJA-4829, or 080…"
          className="mt-2 min-h-16 w-full rounded-lg border-2 border-navy px-4 text-2xl font-bold text-navy"
          autoComplete="off"
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="inline-flex min-h-14 items-center justify-center rounded-lg bg-navy px-5 text-lg font-bold text-white"
          >
            Find booking
          </button>
          {scanning ? (
            <button
              type="button"
              onClick={() => void cancelScan()}
              className="inline-flex min-h-14 items-center justify-center rounded-lg border-2 border-navy bg-white px-5 text-lg font-bold text-navy"
            >
              Cancel camera
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startScan()}
              className="inline-flex min-h-14 items-center justify-center rounded-lg border-2 border-navy bg-white px-5 text-lg font-bold text-navy"
            >
              📷 Scan Buyer&apos;s QR Pass
            </button>
          )}
        </div>
        {scanning ? (
          <div id="cashier-qr-reader" className="mt-4 overflow-hidden rounded-xl bg-black" />
        ) : null}
        {scanError ? (
          <p className="mt-3 text-base font-semibold text-red-800" role="status">
            {scanError}
          </p>
        ) : null}
      </form>

      {notice ? (
        <p className="mt-4 rounded-2xl border-2 border-navy bg-white p-4 text-lg font-semibold" role="status">
          {notice}
        </p>
      ) : null}

      {matches.length > 1 && !selected ? (
        <ul className="mt-4 space-y-3">
          {matches.map((booking) => (
            <li key={booking.id}>
              <button
                type="button"
                onClick={() => setSelectedId(booking.id)}
                className="flex min-h-14 w-full items-center justify-between rounded-xl border-2 border-navy bg-white px-4 text-left text-lg font-bold text-navy"
              >
                <span>
                  #{booking.referenceCode} · {booking.fullName}
                </span>
                <span>{booking.whatsappNumber}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selected ? (
        <article className="mt-6 rounded-2xl border-4 border-navy bg-white p-5">
          <StatusBanner booking={selected} />
          <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            {selected.selfieDataUrl ? (
              // Data-URL selfies cannot use next/image.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.selfieDataUrl}
                alt={`Face photo of ${selected.fullName}`}
                className="h-64 w-64 rounded-full border-4 border-navy object-cover"
              />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-full bg-slate-200 text-lg font-bold text-navy">
                No photo
              </div>
            )}
            <div>
              <h3 className="text-3xl font-bold text-navy">{selected.fullName}</h3>
              <p className="mt-1 text-2xl font-bold text-champions">#{selected.referenceCode}</p>
              <p className="mt-2 text-lg">{selected.whatsappNumber}</p>
            </div>
          </div>

          <h3 className="mt-6 text-xl font-bold text-navy">
            Physical labeled tickets to hand over
          </h3>
          <ul className="mt-3 space-y-2 text-lg">
            {selected.items.map((line) => (
              <li key={line.productId}>
                🎟️ Hand Over {line.quantity}x Physical Ticket Labeled: {line.productName}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-2xl font-bold text-navy">
            Total Ticket Fee to Collect Now: {formatNaira(selected.totalTicketFee)}
          </p>

          {selected.status === "PENDING_VERIFICATION" ? (
            <button
              type="button"
              onClick={quickAccredit}
              className="mt-6 inline-flex min-h-14 items-center justify-center rounded-lg bg-amber-500 px-5 text-lg font-bold text-navy"
            >
              Quick Accredit &amp; Approve Now
            </button>
          ) : null}

          {selected.status === "ACCREDITED" ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-base font-bold text-navy">
                Payment method
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value as TicketPaymentMethod)}
                  className="mt-2 min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
                >
                  {METHODS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-base font-bold text-navy">
                Cashier name (optional)
                <input
                  value={cashierName}
                  onChange={(event) => setCashierName(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
                />
              </label>
              <button
                type="button"
                onClick={confirmPaid}
                className="inline-flex min-h-16 items-center justify-center rounded-lg bg-emerald px-5 text-xl font-bold text-white sm:col-span-2"
              >
                ✅ Confirm Ticket Fee Paid &amp; Hand Over Physical Tickets
              </button>
            </div>
          ) : null}

          {selected.status === "PAID_ISSUED" && receipt ? (
            <a
              href={receipt}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-16 w-full items-center justify-center rounded-lg bg-emerald px-5 text-xl font-bold text-white"
            >
              📲 Send Ticket Fee Receipt on WhatsApp
            </a>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}

function StatusBanner({ booking }: { booking: HouseholdBooking }) {
  if (booking.status === "ACCREDITED") {
    return (
      <div className="rounded-2xl border-4 border-emerald bg-emerald/10 p-4 text-xl font-bold leading-relaxed text-navy">
        <p>🟢 ACCREDITED &amp; CLEARED TO PAY FOR TICKETS</p>
        <p className="mt-2 text-lg">
          Pickup batch: {booking.pickupBatch || "No batch assigned yet."}
        </p>
      </div>
    );
  }
  if (booking.status === "PAID_ISSUED") {
    const when = booking.paidAt ? formatDeadline(booking.paidAt) : "an earlier time";
    const who = booking.issuedBy || "the cashier desk";
    return (
      <div className="rounded-2xl border-4 border-champions bg-champions/10 p-4 text-xl font-bold leading-relaxed text-navy">
        🔵 ⚠️ STOP! TICKETS ALREADY PAID &amp; COLLECTED ON {when} BY {who}
      </div>
    );
  }
  if (booking.status === "PENDING_VERIFICATION") {
    return (
      <div className="rounded-2xl border-4 border-amber-500 bg-amber-100 p-4 text-xl font-bold leading-relaxed text-navy">
        🟡 NOT YET ACCREDITED BY COMMITTEE
      </div>
    );
  }
  return (
    <div className="rounded-2xl border-4 border-red-800 bg-red-50 p-4 text-xl font-bold leading-relaxed text-red-900">
      🔴 INVALID / EXPIRED BOOKING — DO NOT ISSUE TICKETS
    </div>
  );
}

function referenceFromQr(text: string) {
  const parts = text.split("|").map((part) => part.trim());
  if (parts[0] !== "CANAAN-JUBILEE" || !parts[1]) return null;
  return parts[1];
}

async function closeScanner(scanner: Html5Qrcode | null) {
  if (!scanner) return;
  try {
    if (scanner.isScanning) await scanner.stop();
    scanner.clear();
  } catch {
    // The camera is already closed.
  }
}
