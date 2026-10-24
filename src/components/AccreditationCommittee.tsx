"use client";

/* eslint-disable @next/next/no-img-element -- selfies are data URLs, which next/image cannot render */

import { useEffect, useMemo, useState } from "react";
import {
  accreditHousehold,
  extendHouseholdWindow,
  formatNaira,
  groupHouseholds,
  holdRemaining,
  householdVettingNotes,
  rejectOrExpireHousehold,
  releaseAllExpiredBookings,
  simulateHouseholdExpiry,
  statusLabel,
  type CommitteeGroupMode,
  type HouseholdBooking,
} from "@/lib/catalogStore";

type ReviewFilter =
  | "all"
  | "pending"
  | "flagged"
  | "member"
  | "guest"
  | "accredited"
  | "paid"
  | "closed";

const FILTERS: { id: ReviewFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending Review" },
  { id: "flagged", label: "⚠️ Flagged Duplicates" },
  { id: "member", label: "Church Members" },
  { id: "guest", label: "Non-Members (Guests)" },
  { id: "accredited", label: "Accredited" },
  { id: "paid", label: "Paid & Issued" },
  { id: "closed", label: "Rejected/Expired" },
];

function holdsStock(booking: HouseholdBooking) {
  return (
    booking.status === "PENDING_VERIFICATION" || booking.status === "ACCREDITED"
  );
}

function matchesSearch(booking: HouseholdBooking, query: string) {
  const needle = query.trim().toLowerCase().replace(/^#/, "");
  if (!needle) return true;
  return [
    booking.referenceCode,
    booking.fullName,
    booking.whatsappNumber,
    booking.ninOrVoterId,
    booking.homeAddress,
    booking.churchUnitOrReferee,
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function matchesFilter(
  booking: HouseholdBooking,
  filter: ReviewFilter,
  flagged: boolean,
) {
  switch (filter) {
    case "pending":
      return booking.status === "PENDING_VERIFICATION";
    case "flagged":
      return flagged;
    case "member":
      return booking.category === "MEMBER";
    case "guest":
      return booking.category === "GUEST";
    case "accredited":
      return booking.status === "ACCREDITED";
    case "paid":
      return booking.status === "PAID_ISSUED";
    case "closed":
      return booking.status === "REJECTED" || booking.status === "EXPIRED";
    default:
      return true;
  }
}

export function AccreditationCommittee({
  households,
  batches,
}: {
  households: HouseholdBooking[];
  batches: string[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [groupMode, setGroupMode] = useState<CommitteeGroupMode>("none");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ src: string; name: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const members = households.filter((booking) => booking.category === "MEMBER").length;
  const guests = households.length - members;
  const pending = households.filter(
    (booking) => booking.status === "PENDING_VERIFICATION",
  ).length;
  const accredited = households.filter((booking) => booking.status === "ACCREDITED").length;
  const flagged = households.filter(
    (booking) => householdVettingNotes(booking, households).red.length > 0,
  ).length;
  const overdue = households.filter(
    (booking) =>
      now != null &&
      holdsStock(booking) &&
      new Date(booking.expiresAt).getTime() < now,
  );

  const visible = useMemo(
    () =>
      households.filter((booking) => {
        const notes = householdVettingNotes(booking, households);
        return (
          matchesSearch(booking, query) &&
          matchesFilter(booking, filter, notes.red.length > 0)
        );
      }),
    [filter, households, query],
  );
  const groups = groupHouseholds(visible, groupMode);

  function simulateSelected() {
    if (!selectedId) return;
    const next = simulateHouseholdExpiry(selectedId);
    setNotice(
      next
        ? `#${next.referenceCode} is now past the confirmation window. Release all expired stock to return the tickets.`
        : "Select a pending or accredited booking before simulating expiry.",
    );
  }

  function releaseExpired() {
    const released = releaseAllExpiredBookings();
    setNotice(
      released.length === 0
        ? "No pending or accredited bookings are past their window."
        : `Released stock for ${released.length} expired household${released.length === 1 ? "" : "s"}.`,
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-2xl font-bold text-navy">
        🛡️ Household Accreditation &amp; Vetting
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Households registered"
          value={`${households.length}`}
          detail={`${members} church members · ${guests} non-member guests`}
        />
        <SummaryCard title="Pending accreditation" value={`${pending}`} detail="Waiting for committee review" />
        <SummaryCard title="Accredited passes" value={`${accredited}`} detail="Ready for ticket payment" />
        <SummaryCard title="Suspicious flags" value={`${flagged}`} detail="Device, address, or referee matches" />
        <SummaryCard
          title="Expired past the window"
          value={`${overdue.length}`}
          detail="Still holding hidden stock"
        />
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={releaseExpired}
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-navy px-5 text-base font-bold text-white"
        >
          Release All Expired Stock
        </button>
        <button
          type="button"
          disabled={!selectedId}
          onClick={simulateSelected}
          className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-navy bg-white px-5 text-base font-bold text-navy disabled:border-slate-300 disabled:text-slate-500"
        >
          Simulate 72h Expiry on Selected Booking
        </button>
      </div>
      {notice ? (
        <p className="mt-4 rounded-lg bg-slate-100 p-4 text-lg font-semibold" role="status">
          {notice}
        </p>
      ) : null}

      <div className="mt-6 rounded-2xl border-2 border-navy bg-white p-4">
        <label className="block text-base font-bold text-navy" htmlFor="committee-search">
          Search households
        </label>
        <input
          id="committee-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Reference, name, WhatsApp, NIN, address, or leader"
          className="mt-2 min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={
                filter === item.id
                  ? "inline-flex min-h-10 items-center rounded-full bg-navy px-4 text-base font-bold text-white"
                  : "inline-flex min-h-10 items-center rounded-full border-2 border-navy bg-white px-4 text-base font-bold text-navy"
              }
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-base font-bold text-navy" htmlFor="committee-group">
          Group by
        </label>
        <select
          id="committee-group"
          value={groupMode}
          onChange={(event) => setGroupMode(event.target.value as CommitteeGroupMode)}
          className="mt-2 min-h-12 w-full rounded-lg border-2 border-navy bg-white px-3 text-lg"
        >
          <option value="none">No Grouping (Newest First)</option>
          <option value="surname">
            Group by Surname (Compare Addresses &amp; Unit Leaders side-by-side)
          </option>
          <option value="anchor">
            Group by Church Unit / Member Referee (Spot multiple people using the same Referee)
          </option>
          <option value="address">Group by Home Street Address / Device Hash</option>
        </select>
      </div>

      {groups.every((group) => group.bookings.length === 0) ? (
        <p className="mt-6 rounded-2xl border-2 border-navy bg-white p-5 text-lg font-semibold">
          No households match this search.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.title || "all"} className="mt-6">
            {group.title ? (
              <h3 className="text-xl font-bold text-navy">{group.title}</h3>
            ) : null}
            <ul className="mt-3 space-y-5">
              {group.bookings.map((booking) => (
                <VettingCard
                  key={booking.id}
                  booking={booking}
                  households={households}
                  batches={batches}
                  selected={selectedId === booking.id}
                  onSelect={() => setSelectedId(booking.id)}
                  onPhoto={(src, name) => setPhoto({ src, name })}
                />
              ))}
            </ul>
          </div>
        ))
      )}

      {photo ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPhoto(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Enlarged face photo of ${photo.name}`}
            className="rounded-2xl bg-white p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={photo.src}
              alt={`Face photo of ${photo.name}`}
              className="max-h-[70vh] max-w-full rounded-2xl object-contain"
            />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-navy px-5 text-base font-bold text-white"
            >
              Close photo
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SummaryCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border-2 border-navy bg-white p-4">
      <p className="text-sm font-bold tracking-wide text-champions uppercase">{title}</p>
      <p className="mt-1 text-3xl font-bold text-navy">{value}</p>
      <p className="mt-1 text-base leading-snug">{detail}</p>
    </article>
  );
}

function VettingCard({
  booking,
  households,
  batches,
  selected,
  onSelect,
  onPhoto,
}: {
  booking: HouseholdBooking;
  households: HouseholdBooking[];
  batches: string[];
  selected: boolean;
  onSelect: () => void;
  onPhoto: (src: string, name: string) => void;
}) {
  const notes = householdVettingNotes(booking, households);
  const [batch, setBatch] = useState(booking.pickupBatch || batches[0] || "");
  const [reason, setReason] = useState("");
  const [notifyUrl, setNotifyUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function approve() {
    const result = accreditHousehold(booking.id, batch, "");
    if (!result) {
      setMessage("This booking could not be accredited.");
      return;
    }
    setNotifyUrl(null);
    setMessage(`#${result.booking.referenceCode} is accredited for ${result.booking.pickupBatch}.`);
    if (result.whatsappUrl) window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
  }

  function reject() {
    const result = rejectOrExpireHousehold(
      booking.id,
      "REJECTED",
      reason.trim() || "Duplicate registration from same household",
    );
    if (!result) {
      setMessage("Only a pending or accredited booking can return stock.");
      return;
    }
    setNotifyUrl(result.whatsappUrl);
    setMessage(`#${result.booking.referenceCode} was rejected and its tickets returned to stock.`);
  }

  function expireNow() {
    const result = rejectOrExpireHousehold(
      booking.id,
      "EXPIRED",
      "Committee test expiry.",
    );
    if (!result) {
      setMessage("Only a pending or accredited booking can be expired.");
      return;
    }
    setNotifyUrl(null);
    setMessage(`#${result.booking.referenceCode} expired and its tickets returned to stock.`);
  }

  return (
    <li
      className={
        selected
          ? "rounded-2xl border-4 border-champions bg-white p-5"
          : "rounded-2xl border-2 border-navy bg-white p-5"
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        {booking.selfieDataUrl ? (
          <button
            type="button"
            onClick={() => onPhoto(booking.selfieDataUrl, booking.fullName)}
            className="shrink-0"
            aria-label={`Enlarge face photo of ${booking.fullName}`}
          >
            <img
              src={booking.selfieDataUrl}
              alt={`Face photo of ${booking.fullName}`}
              className="h-36 w-36 rounded-full border-4 border-navy object-cover"
            />
          </button>
        ) : (
          <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-navy">
            No photo
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-bold text-navy">{booking.fullName}</h3>
            <span className="inline-flex min-h-10 items-center rounded-full bg-navy px-4 text-base font-bold text-white">
              {booking.category === "MEMBER" ? "⛪ Church Member" : "🤝 Non-Member Guest"}
            </span>
          </div>
          <p className="mt-1 text-xl font-bold text-champions">#{booking.referenceCode}</p>
          <p className="mt-1 text-base font-semibold">{statusLabel(booking.status)}</p>
          <p
            className={
              booking.whatsappInitiated
                ? "mt-2 inline-flex min-h-10 items-center rounded-full bg-emerald px-4 text-base font-bold text-white"
                : "mt-2 inline-flex min-h-10 items-center rounded-full bg-amber-100 px-4 text-base font-bold text-navy"
            }
          >
            {booking.whatsappInitiated
              ? "✅ WhatsApp Initiated"
              : "⏳ Awaiting WhatsApp Click"}
          </p>
          <HoldLine expiresAt={booking.expiresAt} />
        </div>
        <button
          type="button"
          aria-pressed={selected}
          onClick={onSelect}
          className="inline-flex h-12 items-center justify-center self-start rounded-lg border-2 border-navy px-4 text-base font-bold text-navy"
        >
          {selected ? "Selected" : "Select"}
        </button>
      </div>

      <dl className="mt-4 grid gap-3 text-base sm:grid-cols-2">
        <div>
          <dt className="font-bold text-navy">WhatsApp</dt>
          <dd>{booking.whatsappNumber}</dd>
        </div>
        <div>
          <dt className="font-bold text-navy">NIN / Voter&apos;s Card</dt>
          <dd>{booking.ninOrVoterId}</dd>
        </div>
        <div>
          <dt className="font-bold text-navy">Street address</dt>
          <dd>{booking.homeAddress}</dd>
        </div>
        <div>
          <dt className="font-bold text-navy">Unit leader / member referee</dt>
          <dd>{booking.churchUnitOrReferee}</dd>
        </div>
      </dl>

      {notes.red.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {notes.red.map((flag) => (
            <li key={flag} className="rounded-lg bg-red-800 px-3 py-2 text-base font-bold text-white">
              {flag}
            </li>
          ))}
        </ul>
      ) : notes.surnameOthers > 0 ? (
        <p className="mt-4 rounded-lg bg-champions px-3 py-2 text-base font-bold text-white">
          ℹ️ Shares surname with {notes.surnameOthers} other household
          {notes.surnameOthers === 1 ? "" : "s"} — verify distinct address &amp; Unit
          Leader before approving.
        </p>
      ) : null}

      <ul className="mt-4 space-y-1 text-lg">
        {booking.items.map((line) => (
          <li key={line.productId}>
            {line.productName} × {line.quantity} ={" "}
            {formatNaira(line.quantity * line.ticketUnitPrice)}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xl font-bold text-navy">
        Total Ticket Fee: {formatNaira(booking.totalTicketFee)}
      </p>

      <div className="mt-4 grid gap-3">
        <label className="block text-base font-bold text-navy">
          Pickup batch
          <select
            value={batch}
            onChange={(event) => setBatch(event.target.value)}
            className="mt-1 min-h-12 w-full rounded-lg border-2 border-navy bg-white px-3 text-lg"
          >
            {batches.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-3 lg:flex-row">
          <button
            type="button"
            onClick={approve}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg bg-emerald px-4 text-base font-bold text-white"
          >
            🟢 Approve &amp; Send WhatsApp Pass
          </button>
          <button
            type="button"
            onClick={() => {
              const next = extendHouseholdWindow(booking.id, 24);
              setMessage(
                next
                  ? `#${next.referenceCode} window extended by 24 hours.`
                  : "This window could not be extended.",
              );
            }}
            className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-navy px-4 text-base font-bold text-navy"
          >
            ⏱️ +24h Extend
          </button>
          <button
            type="button"
            onClick={expireNow}
            className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-navy px-4 text-base font-bold text-navy"
          >
            Test Expire Now
          </button>
        </div>
        <label className="block text-base font-bold text-navy">
          Rejection reason
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Duplicate registration from same household"
            className="mt-1 min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
          />
        </label>
        <button
          type="button"
          onClick={reject}
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-red-800 px-4 text-base font-bold text-white"
        >
          🔴 Reject Duplicate / Cancel (Return Stock)
        </button>
        {notifyUrl ? (
          <a
            href={notifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-emerald px-4 text-base font-bold text-emerald"
          >
            Send polite WhatsApp notice
          </a>
        ) : null}
        {message ? (
          <p className="rounded-lg bg-slate-100 p-3 text-base font-semibold" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function HoldLine({ expiresAt }: { expiresAt: string }) {
  const [label, setLabel] = useState(() => holdRemaining(expiresAt));

  useEffect(() => {
    const id = window.setInterval(() => setLabel(holdRemaining(expiresAt)), 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  return <p className="mt-2 text-base font-semibold">{label}</p>;
}
