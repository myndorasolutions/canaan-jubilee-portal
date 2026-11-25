"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  accreditHousehold,
  extendHouseholdWindow,
  compactBookingsCsv,
  formatNaira,
  holdRemaining,
  householdVettingNotes,
  markTicketsPaidAndIssued,
  rejectOrExpireHousehold,
  releaseAllExpiredBookings,
  type HouseholdBooking,
  type HouseholdCategory,
  type HouseholdStatus,
} from "@/lib/catalogStore";

type CategoryFilter = "all" | HouseholdCategory;
type StatusFilter = "all" | "pending" | "accredited" | "paid" | "closed";

const CATEGORY_FILTERS: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "MEMBER", label: "Member" },
  { id: "GUEST", label: "Guest" },
];

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "accredited", label: "Accredited" },
  { id: "paid", label: "Paid" },
  { id: "closed", label: "Rejected/Expired" },
];

function matchesSearch(booking: HouseholdBooking, query: string) {
  const needle = query.trim().toLowerCase().replace(/^#/, "");
  if (!needle) return true;
  return [booking.referenceCode, booking.fullName, booking.whatsappNumber]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function matchesStatus(booking: HouseholdBooking, filter: StatusFilter) {
  switch (filter) {
    case "pending":
      return booking.status === "PENDING_VERIFICATION";
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

function statusPill(status: HouseholdStatus) {
  switch (status) {
    case "PENDING_VERIFICATION":
      return "bg-amber-200 text-navy";
    case "ACCREDITED":
      return "bg-emerald text-white";
    case "PAID_ISSUED":
      return "bg-navy text-white";
    case "EXPIRED":
      return "bg-slate-600 text-white";
    case "REJECTED":
      return "bg-red-800 text-white";
  }
}

function downloadFilteredBookingsCsv(households: HouseholdBooking[]) {
  const csv = compactBookingsCsv(households);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  link.href = url;
  link.download = `canaan-jubilee-bookings-${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function shortStatus(status: HouseholdStatus) {
  switch (status) {
    case "PENDING_VERIFICATION":
      return "Pending";
    case "ACCREDITED":
      return "Accredited";
    case "PAID_ISSUED":
      return "Paid";
    case "EXPIRED":
      return "Expired";
    case "REJECTED":
      return "Rejected";
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
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
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
  const paid = households.filter((booking) => booking.status === "PAID_ISSUED").length;

  const visible = useMemo(
    () =>
      households.filter(
        (booking) =>
          matchesSearch(booking, query) &&
          (category === "all" || booking.category === category) &&
          matchesStatus(booking, status),
      ),
    [category, households, query, status],
  );

  function releaseExpired() {
    const released = releaseAllExpiredBookings();
    setNotice(
      released.length === 0
        ? "No pending or accredited bookings are past their window."
        : `Released stock for ${released.length} expired household${released.length === 1 ? "" : "s"}.`,
    );
  }

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-navy">Bookings</h2>
        <button
          type="button"
          onClick={releaseExpired}
          className="inline-flex h-8 items-center rounded-lg border border-navy px-3 text-xs font-bold text-navy"
        >
          Release expired stock
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Metric label="Total Bookings" value={String(households.length)} />
        <Metric label="Members vs Guests" value={`${members} / ${guests}`} />
        <Metric label="Pending" value={String(pending)} />
        <Metric label="Accredited" value={String(accredited)} />
        <Metric label="Paid/Issued" value={String(paid)} />
      </div>

      {notice ? (
        <p className="mt-2 rounded bg-slate-100 px-3 py-2 text-xs font-semibold" role="status">
          {notice}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 rounded-lg border border-navy/20 bg-white p-2 lg:flex-row lg:items-center">
        <label className="min-w-0 flex-1 text-xs font-bold text-navy" htmlFor="committee-search">
          <span className="sr-only">Search bookings</span>
          <input
            id="committee-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Code, name, or WhatsApp"
            className="h-8 w-full rounded border border-navy px-2 text-sm"
          />
        </label>
        <FilterGroup
          label="Category"
          options={CATEGORY_FILTERS}
          value={category}
          onChange={setCategory}
        />
        <FilterGroup
          label="Status"
          options={STATUS_FILTERS}
          value={status}
          onChange={setStatus}
        />
        <button
          type="button"
          disabled={visible.length === 0}
          onClick={() => downloadFilteredBookingsCsv(visible)}
          className="inline-flex h-8 shrink-0 items-center rounded-lg border border-navy px-3 text-xs font-bold text-navy disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
        >
          Export CSV ({visible.length})
        </button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-navy/20 bg-white">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm text-navy">
          <thead>
            <tr className="border-b border-navy/15 bg-slate-50 text-xs uppercase">
              <th className="px-3 py-2 font-bold">Code</th>
              <th className="px-3 py-2 font-bold">Household</th>
              <th className="px-3 py-2 font-bold">Type</th>
              <th className="px-3 py-2 font-bold">Items</th>
              <th className="px-3 py-2 font-bold">Status</th>
              <th className="px-3 py-2 font-bold">Batch / Time</th>
              <th className="px-3 py-2 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-xs font-semibold" colSpan={7}>
                  No households match this search.
                </td>
              </tr>
            ) : (
              visible.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  households={households}
                  batches={batches}
                  now={now}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-navy/20 bg-white px-3 py-1">
      <span className="font-semibold text-slate-600">{label}</span>
      <span className="font-bold text-navy">{value}</span>
    </p>
  );
}

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={
            value === option.id
              ? "h-8 rounded-full bg-navy px-3 text-xs font-bold text-white"
              : "h-8 rounded-full border border-navy px-3 text-xs font-bold text-navy"
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function BookingRow({
  booking,
  households,
  batches,
  now,
}: {
  booking: HouseholdBooking;
  households: HouseholdBooking[];
  batches: string[];
  now: number | null;
}) {
  const notes = householdVettingNotes(booking, households);
  const [open, setOpen] = useState(false);
  const [batch, setBatch] = useState(booking.pickupBatch || batches[0] || "");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const items = booking.items
    .map((line) => `${line.quantity}× ${line.productName}`)
    .join(", ");
  const timeLeft =
    booking.status === "PENDING_VERIFICATION" || booking.status === "ACCREDITED"
      ? holdRemaining(booking.expiresAt, now ?? Date.now())
      : "";

  async function approve() {
    if (saving) return;
    setSaving(true);
    setLink(null);
    try {
      const result = await accreditHousehold(booking.id, batch, "");
      if (!result) {
        setMessage("This booking could not be accredited.");
        return;
      }
      setMessage(`#${result.booking.referenceCode} is accredited.`);
      if (!result.whatsappUrl) return;
      const opened = window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
      if (!opened) setLink(result.whatsappUrl);
    } catch (error) {
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "Accreditation could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  function markPaid() {
    const result = markTicketsPaidAndIssued(booking.id, "CASH", "Admin desk");
    if (!result) {
      setMessage("Only an accredited booking can be marked paid.");
      return;
    }
    setMessage(`#${result.booking.referenceCode} is marked paid.`);
    if (result.whatsappUrl) setLink(result.whatsappUrl);
  }

  function reject() {
    const result = rejectOrExpireHousehold(
      booking.id,
      "REJECTED",
      reason.trim() || "Duplicate registration from same household",
    );
    setMessage(
      result
        ? `#${result.booking.referenceCode} was rejected and its tickets returned to stock.`
        : "Only a pending or accredited booking can return stock.",
    );
    if (result?.whatsappUrl) setLink(result.whatsappUrl);
  }

  return (
    <Fragment>
      <tr className="border-b border-slate-100 align-top">
        <td className="px-3 py-2 font-mono text-xs font-bold">#{booking.referenceCode}</td>
        <td className="px-3 py-2">
          <p className="font-semibold">{booking.fullName}</p>
          <p className="text-xs text-slate-500">{booking.whatsappNumber}</p>
        </td>
        <td className="px-3 py-2">
          <span
            className={
              booking.category === "MEMBER"
                ? "inline-flex rounded-full bg-navy px-2 py-0.5 text-xs font-bold text-white"
                : "inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-navy"
            }
          >
            {booking.category === "MEMBER" ? "Member" : "Guest"}
          </span>
        </td>
        <td className="px-3 py-2 text-xs">
          <p>{items || "No items"}</p>
          <p className="font-bold">{formatNaira(booking.totalTicketFee)}</p>
        </td>
        <td className="px-3 py-2">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${statusPill(booking.status)}`}>
            {shortStatus(booking.status)}
          </span>
        </td>
        <td className="px-3 py-2 text-xs">
          <p>{booking.pickupBatch || "No batch"}</p>
          {timeLeft ? <p className="text-slate-500">{timeLeft}</p> : null}
        </td>
        <td className="px-3 py-2">
          <div className="flex flex-wrap gap-1">
            {booking.status === "PENDING_VERIFICATION" ? (
              <button
                type="button"
                onClick={() => void approve()}
                disabled={saving}
                className="rounded bg-emerald px-2 py-1 text-xs font-bold text-white disabled:bg-slate-300"
              >
                {saving ? "Saving…" : "Approve & WhatsApp"}
              </button>
            ) : null}
            {booking.status === "ACCREDITED" ? (
              <button
                type="button"
                onClick={markPaid}
                className="rounded bg-navy px-2 py-1 text-xs font-bold text-white"
              >
                Mark Paid
              </button>
            ) : null}
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((current) => !current)}
              className="rounded border border-navy px-2 py-1 text-xs font-bold"
            >
              {open ? "Hide" : "Details"}
            </button>
          </div>
          {message ? <p className="mt-1 text-xs font-semibold">{message}</p> : null}
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-xs font-bold text-emerald"
            >
              Open WhatsApp
            </a>
          ) : null}
        </td>
      </tr>
      {open ? (
        <tr className="border-b border-navy/10 bg-slate-50">
          <td className="px-3 py-2 text-xs" colSpan={7}>
            <div className="grid gap-2 sm:grid-cols-2">
              <p>
                <span className="font-bold">Address: </span>
                {booking.homeAddress || "—"}
              </p>
              <p>
                <span className="font-bold">Unit / referee: </span>
                {booking.churchUnitOrReferee || "—"}
              </p>
            </div>
            {notes.red.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {notes.red.map((flag) => (
                  <li key={flag} className="rounded bg-red-800 px-2 py-1 font-bold text-white">
                    {flag}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="text-xs font-bold">
                Pickup batch
                <select
                  value={batch}
                  onChange={(event) => setBatch(event.target.value)}
                  className="mt-1 block h-8 rounded border border-navy bg-white px-2 text-sm"
                >
                  {batches.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
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
                className="h-8 rounded border border-navy px-2 text-xs font-bold"
              >
                +24h
              </button>
              <label className="min-w-48 flex-1 text-xs font-bold">
                Rejection reason
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Duplicate registration"
                  className="mt-1 h-8 w-full rounded border border-navy px-2 text-sm font-normal"
                />
              </label>
              <button
                type="button"
                onClick={reject}
                className="h-8 rounded bg-red-800 px-2 text-xs font-bold text-white"
              >
                Reject
              </button>
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}
