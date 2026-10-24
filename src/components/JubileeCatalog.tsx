"use client";

/* eslint-disable @next/next/no-img-element -- selfies are data URLs, which next/image cannot render */

import { FormEvent, useState, type ReactNode } from "react";
import { BookingSlip } from "@/components/BookingSlip";
import { ItemVisual } from "@/components/ItemVisual";
import { SelfieCapture } from "@/components/SelfieCapture";
import {
  formatNaira,
  markWhatsappInitiated,
  quotaLabel,
  submitHouseholdBooking,
  usePublicCatalog,
  verifyHouseholdGate,
  type HouseholdBooking,
  type HouseholdCategory,
  type PublicCatalogItem,
  type SystemSettings,
  type VerifiedProfile,
} from "@/lib/catalogStore";

const STAGES = [
  "STAGE 1: Household Registration (Identity & Anti-Duplicate Gate)",
  "STAGE 2: Select & Book Jubilee Tickets",
  "STAGE 3: Booking Reference & 72-Hour WhatsApp Confirmation",
] as const;

export default function JubileeCatalog() {
  const { portalOpen, items, ready, settings } = usePublicCatalog();

  if (!ready) {
    return (
      <p className="mx-auto max-w-6xl px-4 py-10 text-lg font-semibold text-navy">
        Loading Jubilee items…
      </p>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      {portalOpen ? (
        <OpenCatalog items={items} settings={settings} />
      ) : (
        <p className="rounded-2xl bg-navy p-6 text-xl font-bold leading-relaxed text-white sm:text-2xl">
          The Canaan Jubilee Auction Portal is currently being stocked by the
          Admin. Please check back when registration opens.
        </p>
      )}
    </section>
  );
}

function OpenCatalog({
  items,
  settings,
}: {
  items: PublicCatalogItem[];
  settings: SystemSettings;
}) {
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [profile, setProfile] = useState<VerifiedProfile | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [category, setCategory] = useState<HouseholdCategory>("MEMBER");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [nin, setNin] = useState("");
  const [address, setAddress] = useState("");
  const [unit, setUnit] = useState("");
  const [leader, setLeader] = useState("");
  const [refereeName, setRefereeName] = useState("");
  const [refereePhone, setRefereePhone] = useState("");
  const [selfie, setSelfie] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deviceMessage, setDeviceMessage] = useState<string | null>(null);
  const [elderly, setElderly] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<HouseholdBooking | null>(null);
  const [returning, setReturning] = useState(false);

  const bookable = items.filter(
    (item) => profile?.category !== "GUEST" || item.allowNonMembers,
  );
  const selected = bookable.flatMap((item) => {
    const quantity = Math.min(quantities[item.id] ?? 0, item.maxPerHousehold);
    if (!item.isAvailable || quantity < 1) return [];
    return [{ item, quantity }];
  });
  const ticketCount = selected.reduce((sum, row) => sum + row.quantity, 0);
  const totalFee = selected.reduce(
    (sum, row) => sum + row.quantity * row.item.ticketPrice,
    0,
  );

  function anchorText() {
    if (category === "MEMBER") {
      return `${unit.trim()} — Leader: ${leader.trim()}`;
    }
    return `${refereeName.trim()} — ${refereePhone.trim()}`;
  }

  function goTo(next: 1 | 2 | 3) {
    setStage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const result = verifyHouseholdGate({
      fullName,
      whatsappNumber: whatsapp,
      ninOrVoterId: nin,
      category,
      churchUnitOrReferee: anchorText(),
      homeAddress: address,
      selfieDataUrl: selfie,
    });
    if (!result.ok) {
      if (result.existing && result.existing.items.length > 0) {
        setDone(result.existing);
        setReturning(true);
        setError(result.error.message);
        goTo(3);
        return;
      }
      setError(result.error.message);
      return;
    }
    setProfile(result.profile);
    setQuantities((current) => {
      if (result.profile.category !== "GUEST") return current;
      const copy = { ...current };
      for (const item of items) {
        if (!item.allowNonMembers) copy[item.id] = 0;
      }
      return copy;
    });
    goTo(2);
  }

  async function send(elderlyAssist: boolean) {
    if (!profile) return;
    setPending(true);
    setError(null);
    const result = await submitHouseholdBooking(
      {
        ...profile,
        items: selected.map((row) => ({
          productId: row.item.id,
          quantity: row.quantity,
        })),
      },
      { elderlyAssist },
    );
    setPending(false);
    if (!result.ok) {
      if (result.error.code === "DEVICE") {
        setDeviceMessage(result.error.message);
        setElderly(false);
        return;
      }
      setDeviceMessage(null);
      setError(result.error.message);
      return;
    }
    setDeviceMessage(null);
    setReturning(false);
    setDone(result.booking);
    goTo(3);
  }

  return (
    <div className={stage === 2 && ticketCount > 0 ? "pb-28" : undefined}>
      <ol className="grid gap-3 md:grid-cols-3" aria-label="Booking steps">
        {STAGES.map((label, index) => {
          const number = (index + 1) as 1 | 2 | 3;
          const state =
            stage === number ? "current" : stage > number ? "done" : "locked";
          return (
            <li
              key={label}
              aria-current={state === "current" ? "step" : undefined}
              className={
                state === "current"
                  ? "rounded-2xl border-4 border-champions bg-navy p-4 text-white"
                  : state === "done"
                    ? "rounded-2xl border-2 border-emerald bg-emerald p-4 text-white"
                    : "rounded-2xl border-2 border-slate-300 bg-slate-100 p-4 text-slate-600"
              }
            >
              <p className="text-sm font-bold tracking-wide uppercase">
                {state === "locked" ? "Locked" : state === "done" ? "Done" : "Now"}
              </p>
              <p className="mt-1 text-base font-bold leading-snug">{label}</p>
            </li>
          );
        })}
      </ol>

      {stage === 1 ? (
        <form
          onSubmit={onVerify}
          className="mt-8 rounded-2xl border-2 border-navy bg-white p-5 sm:p-8"
        >
          <h2 className="text-2xl font-bold text-navy">
            Household registration
          </h2>
          <p className="mt-2 text-lg leading-relaxed">
            Tickets stay locked until this household passes the identity
            check. One registration covers the whole household.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={category === "MEMBER"}
              onClick={() => setCategory("MEMBER")}
              className={
                category === "MEMBER"
                  ? "min-h-24 rounded-2xl border-4 border-champions bg-champions px-4 text-left text-lg font-bold text-white"
                  : "min-h-24 rounded-2xl border-2 border-navy bg-white px-4 text-left text-lg font-bold text-navy"
              }
            >
              ⛪ I am a Church Member (Canaan Ministries / Champions&apos; Church)
            </button>
            <button
              type="button"
              aria-pressed={category === "GUEST"}
              onClick={() => setCategory("GUEST")}
              className={
                category === "GUEST"
                  ? "min-h-24 rounded-2xl border-4 border-champions bg-champions px-4 text-left text-lg font-bold text-white"
                  : "min-h-24 rounded-2xl border-2 border-navy bg-white px-4 text-left text-lg font-bold text-navy"
              }
            >
              🤝 I am a Non-Member (Invited Guest / Neighbour)
            </button>
          </div>
          <div className="mt-6 space-y-4">
            <Field label="Full name of head of household">
              <input
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                placeholder="Surname and first name"
                className={inputClass}
              />
            </Field>
            <Field label="Active WhatsApp phone number">
              <input
                required
                inputMode="tel"
                autoComplete="tel"
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                placeholder="08031234567"
                className={inputClass}
              />
            </Field>
            <Field label="11-digit NIN or Voter's Card (VIN)">
              <input
                required
                value={nin}
                onChange={(event) => setNin(event.target.value)}
                autoComplete="off"
                placeholder="11 digits, or your voter's card number"
                className={inputClass}
              />
            </Field>
            <Field label="Residential street address and nearest landmark">
              <textarea
                required
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                rows={3}
                placeholder="House number, street, area, and a landmark"
                className={`${inputClass} py-3`}
              />
            </Field>
            {category === "MEMBER" ? (
              <>
                <Field label="Church department / home cell / unit">
                  <input
                    required
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
                    placeholder="Example: Choir, or House Fellowship 4"
                    className={inputClass}
                  />
                </Field>
                <Field label="Name of unit leader">
                  <input
                    required
                    value={leader}
                    onChange={(event) => setLeader(event.target.value)}
                    placeholder="Leader's full name"
                    className={inputClass}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Church member referee's full name">
                  <input
                    required
                    value={refereeName}
                    onChange={(event) => setRefereeName(event.target.value)}
                    placeholder="The member who knows you"
                    className={inputClass}
                  />
                </Field>
                <Field label="Referee's phone number">
                  <input
                    required
                    inputMode="tel"
                    value={refereePhone}
                    onChange={(event) => setRefereePhone(event.target.value)}
                    placeholder="08031234567"
                    className={inputClass}
                  />
                </Field>
              </>
            )}
            <SelfieCapture value={selfie} onChange={setSelfie} />
          </div>
          {error ? (
            <p className="mt-4 rounded-lg bg-slate-100 p-4 text-lg font-semibold" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="mt-6 inline-flex min-h-14 w-full items-center justify-center rounded-lg bg-emerald px-5 text-lg font-bold text-white"
          >
            Verify Household &amp; Proceed to Ticket Booking →
          </button>
        </form>
      ) : null}

      {stage === 2 && profile ? (
        <div className="mt-8">
          <div className="flex flex-col gap-4 rounded-2xl border-4 border-emerald bg-white p-5 sm:flex-row sm:items-center">
            {profile.selfieDataUrl ? (
              <img
                src={profile.selfieDataUrl}
                alt={`Face photo of ${profile.fullName}`}
                className="h-24 w-24 shrink-0 rounded-full border-4 border-navy object-cover"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-xl font-bold leading-snug text-navy">
                {`Welcome, ${profile.fullName} (${
                  profile.category === "MEMBER" ? "Church Member" : "Invited Guest"
                }) — You may now select your household tickets below`}
              </p>
              <p className="mt-2 inline-flex min-h-10 items-center rounded-full bg-navy px-4 text-base font-bold text-white">
                {profile.category === "MEMBER" ? "Church Member" : "Invited Guest"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => goTo(1)}
              className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-navy bg-white px-5 text-base font-bold text-navy"
            >
              Edit Registration Details
            </button>
          </div>

          <p className="mt-6 rounded-2xl border-4 border-champions bg-white p-5 text-lg font-bold leading-relaxed text-navy">
            IMPORTANT: The amount displayed beside each item is the Ticket Fee
            only. Your physical ticket entitles you to purchase the item at the
            heavily subsidized Jubilee price directly at the physical Point of
            Sale.
          </p>

          {items.length === 0 ? (
            <p className="mt-8 rounded-2xl border-2 border-navy bg-white p-5 text-lg font-semibold">
              No Jubilee items are on display yet.
            </p>
          ) : (
            <ul className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const locked = profile.category === "GUEST" && !item.allowNonMembers;
                return (
                  <ItemCard
                    key={item.id}
                    item={item}
                    locked={locked}
                    quantity={
                      locked
                        ? 0
                        : Math.min(quantities[item.id] ?? 0, item.maxPerHousehold)
                    }
                    onQuantityChange={(quantity) =>
                      setQuantities((current) => ({
                        ...current,
                        [item.id]: quantity,
                      }))
                    }
                  />
                );
              })}
            </ul>
          )}

          <div className="mt-8 rounded-2xl bg-slate-100 p-5">
            <h2 className="text-2xl font-bold text-navy">Your selected tickets</h2>
            {selected.length === 0 ? (
              <p className="mt-3 text-lg">No tickets selected yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-lg">
                {selected.map((row) => (
                  <li key={row.item.id}>
                    {row.item.name} × {row.quantity} ={" "}
                    {formatNaira(row.quantity * row.item.ticketPrice)}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xl font-bold text-navy">
              Total Ticket Fee to Pay: {formatNaira(totalFee)}
            </p>
          </div>
          {error ? (
            <p className="mt-4 rounded-lg bg-slate-100 p-4 text-lg font-semibold" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => void send(false)}
            className="mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-lg bg-emerald px-5 text-lg font-bold text-white disabled:bg-slate-400"
          >
            {pending
              ? "Saving your booking…"
              : "Confirm & Lock Selected Tickets (72-Hour Hold)"}
          </button>
        </div>
      ) : null}

      {stage === 3 && done ? (
        <div className="mt-8">
          {returning && error ? (
            <p className="rounded-2xl border-2 border-navy bg-white p-4 text-lg font-semibold" role="alert">
              {error}
            </p>
          ) : null}
          <BookingSlip
            booking={done}
            settings={settings}
            onWhatsapp={(booking) => {
              const next = markWhatsappInitiated(booking.id);
              if (next) setDone(next);
            }}
          />
        </div>
      ) : null}

      {stage === 2 && ticketCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-4 border-emerald bg-white p-3 shadow-2xl">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-lg font-bold text-navy">
              {ticketCount} Ticket{ticketCount === 1 ? "" : "s"} Selected |
              Total Ticket Fee: {formatNaira(totalFee)}
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() => void send(false)}
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-emerald px-5 text-base font-bold text-white disabled:bg-slate-400"
            >
              Confirm &amp; Lock Selected Tickets (72-Hour Hold)
            </button>
          </div>
        </div>
      ) : null}

      {deviceMessage ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="same-device-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 text-navy"
          >
            <h3 id="same-device-title" className="text-2xl font-bold">
              This phone already has a registration
            </h3>
            <p className="mt-3 text-lg leading-relaxed">{deviceMessage}</p>
            <label className="mt-5 flex min-h-12 items-start gap-3 text-base font-bold">
              <input
                type="checkbox"
                checked={elderly}
                onChange={(event) => setElderly(event.target.checked)}
                className="mt-1 h-6 w-6"
              />
              Assist Another Elderly Person Mode
            </label>
            <p className="mt-2 text-base leading-relaxed">
              Turn this on only when you are helping an elderly person who
              does not have their own phone. The accreditation committee will
              see a red warning that this phone registered more than one
              household.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                disabled={!elderly || pending}
                onClick={() => void send(true)}
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-emerald px-5 text-base font-bold text-white disabled:bg-slate-400"
              >
                Submit this extra registration
              </button>
              <button
                type="button"
                onClick={() => setDeviceMessage(null)}
                className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-navy bg-white px-5 text-base font-bold text-navy"
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const inputClass =
  "min-h-12 w-full rounded-lg border-2 border-navy bg-white px-3 text-lg text-navy";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-base font-bold text-navy">{label}</span>
      {children}
    </label>
  );
}

function ItemCard({
  item,
  quantity,
  locked,
  onQuantityChange,
}: {
  item: PublicCatalogItem;
  quantity: number;
  locked: boolean;
  onQuantityChange: (quantity: number) => void;
}) {
  const ticketCountLabel = quantity === 1 ? "Ticket" : "Tickets";
  const canChange = item.isAvailable && !locked;

  return (
    <li className="flex flex-col rounded-2xl border-2 border-navy/15 bg-white p-5 shadow-sm">
      <ItemVisual imageUrl={item.imageUrl} name={item.name} />
      <p className="mt-4 text-base font-bold tracking-wide text-champions uppercase">
        {item.category}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h3 className="text-2xl font-bold text-navy">{item.name}</h3>
        <span className="inline-flex min-h-12 items-center rounded-full bg-champions px-4 text-lg font-bold text-white">
          Ticket Fee: {formatNaira(item.ticketPrice)}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={
            item.isAvailable
              ? "inline-flex min-h-10 items-center rounded-full bg-emerald px-4 text-base font-bold text-white"
              : "inline-flex min-h-10 items-center rounded-full bg-slate-700 px-4 text-base font-bold text-white"
          }
        >
          {item.isAvailable ? "Available to Book" : "Fully Booked"}
        </span>
        <span className="inline-flex min-h-10 items-center rounded-full border-2 border-navy bg-white px-4 text-base font-bold text-navy">
          {quotaLabel(item.maxPerHousehold)}
        </span>
        {locked ? (
          <span className="inline-flex min-h-10 items-center rounded-full bg-slate-700 px-4 text-base font-bold text-white">
            Reserved for Church Members
          </span>
        ) : null}
      </div>
      <div className="mt-5">
        <p className="text-base font-bold text-navy">How many tickets?</p>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            aria-label={`Fewer tickets for ${item.name}`}
            disabled={!canChange || quantity <= 0}
            onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
            className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-navy text-2xl font-bold text-white disabled:bg-slate-300 disabled:text-slate-600"
          >
            −
          </button>
          <span className="min-w-8 text-center text-2xl font-bold text-navy">
            {canChange ? quantity : 0}
          </span>
          <button
            type="button"
            aria-label={`More tickets for ${item.name}`}
            disabled={!canChange || quantity >= item.maxPerHousehold}
            onClick={() =>
              onQuantityChange(Math.min(item.maxPerHousehold, quantity + 1))
            }
            className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-navy text-2xl font-bold text-white disabled:bg-slate-300 disabled:text-slate-600"
          >
            +
          </button>
        </div>
        {locked ? (
          <p className="mt-3 text-base font-semibold text-navy">
            This item is reserved for church members.
          </p>
        ) : null}
        {canChange && quantity > 0 ? (
          <p className="mt-3 text-lg font-bold leading-snug text-navy" role="status">
            Total Ticket Fee to Pay
            <span className="mt-1 block text-champions">
              {quantity} {ticketCountLabel} Selected ={" "}
              {formatNaira(quantity * item.ticketPrice)}
            </span>
          </p>
        ) : null}
        {!item.isAvailable && !locked ? (
          <p className="mt-3 text-base font-semibold text-navy">
            This item is fully booked.
          </p>
        ) : null}
      </div>
    </li>
  );
}
