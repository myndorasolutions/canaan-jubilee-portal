"use client";

import Link from "next/link";
import { FormEvent, useId, useState, type ReactNode } from "react";
import AdminLogin from "@/components/AdminLogin";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { ImagePicker, ItemVisual } from "@/components/ItemVisual";
import { changeAdminPassword, logoutAdmin, useAdminSession } from "@/lib/adminAuth";
import { AccreditationCommittee } from "@/components/AccreditationCommittee";
import { CashierDesk } from "@/components/CashierDesk";
import {
  bookingsCsv,
  CATEGORIES,
  formatNaira,
  saveSystemSettings,
  seedCloudCatalog,
  useCatalog,
  type CatalogItem,
  type HouseholdBooking,
  type SystemSettings,
} from "@/lib/catalogStore";

type Draft = {
  name: string;
  category: string;
  ticketPrice: string;
  subsidizedItemCost: string;
  maxPerHousehold: string;
  totalStock: string;
  imageUrl: string;
  allowNonMembers: boolean;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  category: CATEGORIES[0],
  ticketPrice: "1000",
  subsidizedItemCost: "",
  maxPerHousehold: "1",
  totalStock: "10",
  imageUrl: "icon:wheat",
  allowNonMembers: true,
};

export default function AdminDashboard() {
  const authed = useAdminSession();
  const {
    catalog,
    mode,
    configured,
    ready,
    cloudError,
    setPortalOpen,
    addItem,
    updateItem,
    deleteItem,
    clearAllItems,
    households,
    settings,
  } = useCatalog();
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);
  const [tab, setTab] = useState<"committee" | "catalog" | "desk" | "cashier">(
    "committee",
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const titleId = useId();

  async function seedCatalog() {
    setSeeding(true);
    setSeedMessage(null);
    const error = await seedCloudCatalog();
    setSeeding(false);
    setSeedMessage(error ?? "The saved catalog is now in Supabase.");
  }

  if (!authed) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <Header />
        <AdminLogin />
        <Footer />
      </div>
    );
  }

  function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    const ticketPrice = Number(draft.ticketPrice);
    const maxPerHousehold = Number(draft.maxPerHousehold);
    const totalStock = Number(draft.totalStock);
    const costText = draft.subsidizedItemCost.trim();
    const subsidizedItemCost = costText === "" ? undefined : Number(costText);

    if (!name) {
      setFormError("Enter the item name.");
      return;
    }
    if (!Number.isFinite(ticketPrice) || ticketPrice < 0) {
      setFormError("Enter a ticket fee of 0 or more.");
      return;
    }
    if (!Number.isFinite(maxPerHousehold) || maxPerHousehold < 1) {
      setFormError("Max tickets per family must be at least 1.");
      return;
    }
    if (!Number.isFinite(totalStock) || totalStock < 0) {
      setFormError("Total secret stock must be 0 or more.");
      return;
    }
    if (
      subsidizedItemCost != null &&
      (!Number.isFinite(subsidizedItemCost) || subsidizedItemCost < 0)
    ) {
      setFormError("Post-ticket item cost must be 0 or more, or left blank.");
      return;
    }

    addItem({
      name,
      category: draft.category,
      ticketPrice,
      subsidizedItemCost,
      maxPerHousehold,
      totalStock,
      isActive: true,
      imageUrl: draft.imageUrl,
      allowNonMembers: draft.allowNonMembers,
    });
    setDraft(EMPTY_DRAFT);
    setFormError(null);
    setFormOpen(false);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold leading-tight text-navy sm:text-4xl">
              Admin / Staff — Jubilee Items
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed">
              Set the ticket fee the public sees, and keep the real Jubilee
              item price and stock numbers on this page only.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <span
              className={
                mode === "supabase"
                  ? "inline-flex min-h-10 items-center rounded-full bg-emerald px-4 text-base font-bold text-white"
                  : "inline-flex min-h-10 items-center rounded-full bg-slate-700 px-4 text-base font-bold text-white"
              }
            >
              {mode === "supabase"
                ? "🟢 Storage: Supabase Cloud Connected"
                : "Storage: Local Testing Mode"}
            </span>
            {!configured ? (
              <p className="max-w-xs text-base font-semibold text-navy">
                No Supabase keys yet. Local testing is active.
              </p>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-navy bg-white px-5 text-base font-bold text-navy"
              >
                How to Connect Supabase
              </button>
              <Link
                href="/"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-navy px-5 text-base font-bold text-white"
              >
                ← View Public Portal
              </Link>
              <button
                type="button"
                onClick={logoutAdmin}
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-red-800 px-5 text-base font-bold text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {cloudError ? (
          <p className="mt-4 rounded-2xl border-2 border-navy bg-white p-4 text-base font-semibold text-navy" role="status">
            Cloud sync did not finish, so this browser is using local testing
            data. {cloudError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => downloadBookingsCsv(households)}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-emerald bg-white px-5 text-base font-bold text-emerald"
        >
          📊 Export All Bookings &amp; Ticket Sales to CSV (Excel)
        </button>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:flex-wrap">
          <button
            type="button"
            onClick={() => setTab("committee")}
            className={
              tab === "committee"
                ? "inline-flex min-h-12 items-center justify-center rounded-lg bg-navy px-5 text-base font-bold text-white"
                : "inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-navy bg-white px-5 text-base font-bold text-navy"
            }
          >
            🛡️ Household Accreditation &amp; Vetting
          </button>
          <button
            type="button"
            onClick={() => setTab("catalog")}
            className={
              tab === "catalog"
                ? "inline-flex min-h-12 items-center justify-center rounded-lg bg-navy px-5 text-base font-bold text-white"
                : "inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-navy bg-white px-5 text-base font-bold text-navy"
            }
          >
            📦 Products, Quotas &amp; Hidden Stock Manager
          </button>
          <button
            type="button"
            onClick={() => setTab("desk")}
            className={
              tab === "desk"
                ? "inline-flex min-h-12 items-center justify-center rounded-lg bg-navy px-5 text-base font-bold text-white"
                : "inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-navy bg-white px-5 text-base font-bold text-navy"
            }
          >
            ⚙️ WhatsApp Desk &amp; 72-Hour Portal Settings
          </button>
          <button
            type="button"
            onClick={() => setTab("cashier")}
            className={
              tab === "cashier"
                ? "inline-flex min-h-12 items-center justify-center rounded-lg bg-navy px-5 text-base font-bold text-white"
                : "inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-navy bg-white px-5 text-base font-bold text-navy"
            }
          >
            💳 Cashier &amp; Ticket Issuing Desk
          </button>
        </div>

        {tab === "cashier" ? (
          <CashierDesk households={households} batches={settings.pickupBatches} />
        ) : tab === "desk" ? (
          <>
            <WhatsAppDeskSettings settings={settings} />
            <AdminSettings />
          </>
        ) : tab === "committee" ? (
          <AccreditationCommittee
            households={households}
            batches={settings.pickupBatches}
          />
        ) : !ready ? (
          <p className="mt-8 text-lg font-semibold">Loading the catalog…</p>
        ) : (
          <>
        {mode === "supabase" && catalog.items.length === 0 ? (
          <section className="mt-8 rounded-2xl border-2 border-emerald bg-white p-5">
            <h2 className="text-2xl font-bold text-navy">Cloud catalog</h2>
            <p className="mt-2 text-lg leading-relaxed">
              Supabase has no Jubilee items yet. This sends the catalog saved
              in this browser. If none is saved, it sends the starter items
              with booked stock at zero.
            </p>
            <button
              type="button"
              onClick={() => void seedCatalog()}
              disabled={seeding}
              className="mt-4 inline-flex min-h-12 items-center justify-center rounded-lg bg-emerald px-5 text-base font-bold text-white disabled:opacity-60"
            >
              {seeding
                ? "Sending the catalog…"
                : "Sync / Seed Initial Catalog to Supabase Cloud"}
            </button>
            {seedMessage ? (
              <p className="mt-3 text-base font-semibold" role="status">
                {seedMessage}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="mt-8 rounded-2xl border-2 border-navy bg-white p-5">
              <h2 className="text-2xl font-bold text-navy">Portal status</h2>
              <p className="mt-2 text-lg">
                Close the portal before registration opens. The public page
                will ask people to check back.
              </p>
              <button
                type="button"
                role="switch"
                aria-checked={catalog.portalOpen}
                onClick={() => setPortalOpen(!catalog.portalOpen)}
                className={
                  catalog.portalOpen
                    ? "mt-4 inline-flex min-h-12 items-center justify-center rounded-lg bg-emerald px-5 text-base font-bold text-white"
                    : "mt-4 inline-flex min-h-12 items-center justify-center rounded-lg bg-slate-700 px-5 text-base font-bold text-white"
                }
              >
                {catalog.portalOpen
                  ? "Portal is OPEN to the public"
                  : "Portal is CLOSED to the public"}
              </button>
            </section>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setFormOpen(true);
                }}
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-champions px-5 text-base font-bold text-white"
              >
                + Add New Jubilee Item
              </button>
              <button
                type="button"
                onClick={() => {
                  if (catalog.items.length === 0) return;
                  if (
                    window.confirm(
                      "Remove every item from the catalog, including the sample items? This cannot be undone.",
                    )
                  ) {
                    clearAllItems();
                  }
                }}
                className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-red-800 bg-white px-5 text-base font-bold text-red-800"
              >
                Clear All Sample Items
              </button>
            </div>

            <ul className="mt-6 space-y-5">
              {catalog.items.map((item) => (
                <AdminItemCard
                  key={item.id}
                  item={item}
                  onUpdate={(patch) => updateItem(item.id, patch)}
                  onDelete={() => {
                    if (
                      window.confirm(
                        `Delete / Remove “${item.name}” from the catalog? This cannot be undone.`,
                      )
                    ) {
                      deleteItem(item.id);
                    }
                  }}
                />
              ))}
            </ul>
          </>
        )}
      </main>
      <Footer />

      {formOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setFormOpen(false)}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onSubmit={onAdd}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 text-navy shadow-xl"
          >
            <h2 id={titleId} className="text-2xl font-bold">
              Add New Jubilee Item
            </h2>
            <div className="mt-5 space-y-4">
              <Field label="Item name">
                <input
                  required
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
                />
              </Field>
              <Field label="Category">
                <select
                  value={draft.category}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  className="min-h-12 w-full rounded-lg border-2 border-navy bg-white px-3 text-lg"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ticket Price / Fee (₦) [Shown to Public]">
                <input
                  inputMode="numeric"
                  value={draft.ticketPrice}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      ticketPrice: event.target.value,
                    }))
                  }
                  className="min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
                />
              </Field>
              <Field label="Post-Ticket Item Cost (₦) [Hidden Until Ticket Paid]">
                <input
                  inputMode="numeric"
                  value={draft.subsidizedItemCost}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      subsidizedItemCost: event.target.value,
                    }))
                  }
                  className="min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
                />
              </Field>
              <Field label="Max Tickets Per Family">
                <input
                  inputMode="numeric"
                  value={draft.maxPerHousehold}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      maxPerHousehold: event.target.value,
                    }))
                  }
                  className="min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
                />
              </Field>
              <Field label="Total Secret Stock">
                <input
                  inputMode="numeric"
                  value={draft.totalStock}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      totalStock: event.target.value,
                    }))
                  }
                  className="min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
                />
              </Field>
              <label className="flex min-h-12 items-center gap-3 text-base font-bold">
                <input
                  type="checkbox"
                  checked={draft.allowNonMembers}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      allowNonMembers: event.target.checked,
                    }))
                  }
                  className="h-6 w-6"
                />
                Guests may book this item
              </label>
              <ImagePicker
                value={draft.imageUrl}
                onChange={(imageUrl) =>
                  setDraft((current) => ({ ...current, imageUrl }))
                }
              />
            </div>
            {formError ? (
              <p className="mt-4 rounded-lg bg-slate-100 p-4 text-lg font-semibold" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg bg-champions px-5 text-base font-bold text-white"
              >
                Add Item to Catalog
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg border-2 border-navy bg-white px-5 text-base font-bold text-navy"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {helpOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setHelpOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="supabase-help-title"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 text-navy shadow-xl"
          >
            <h2 id="supabase-help-title" className="text-2xl font-bold">
              How to Connect Supabase
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-6 text-lg leading-relaxed">
              <li>Create a project at supabase.com.</li>
              <li>
                Open the SQL Editor and run the file{" "}
                <span className="font-bold">sql/supabase_schema.sql</span>.
              </li>
              <li>
                In this project folder, create{" "}
                <span className="font-bold">.env.local</span> with
                NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
                You can also set NEXT_PUBLIC_ADMIN_PASSWORD.
              </li>
              <li>Stop the dev server and start it again with npm run dev.</li>
              <li>
                The badge should then say Storage: Supabase Cloud Connected.
                Until those keys exist, the portal stays in local testing mode.
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-navy px-5 text-base font-bold text-white"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function downloadBookingsCsv(households: HouseholdBooking[]) {
  const csv = bookingsCsv(households);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "canaan-jubilee-ticket-sales.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function WhatsAppDeskSettings({ settings }: { settings: SystemSettings }) {
  const [desk, setDesk] = useState(settings.whatsappDeskNumber);
  const [hours, setHours] = useState(String(settings.replyWindowHours));
  const [instructions, setInstructions] = useState(settings.churchPaymentInstructions);
  const [batches, setBatches] = useState(settings.pickupBatches);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await saveSystemSettings({
      whatsappDeskNumber: desk,
      replyWindowHours: Number(hours),
      churchPaymentInstructions: instructions,
      pickupBatches: batches,
    });
    setPending(false);
    if (result) {
      setError(result);
      return;
    }
    setError(null);
    setMessage("WhatsApp desk settings are saved.");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 max-w-3xl rounded-2xl border-2 border-navy bg-white p-5"
    >
      <h2 className="text-2xl font-bold text-navy">
        ⚙️ WhatsApp Desk &amp; 72-Hour Settings
      </h2>
      <p className="mt-2 text-lg leading-relaxed">
        These details are used on the public confirmation slip and the
        WhatsApp click-to-chat button. Enter the desk number as 080… or 234….
      </p>
      <div className="mt-4 space-y-4">
        <Field label="Church WhatsApp phone number">
          <input
            required
            inputMode="tel"
            value={desk}
            onChange={(event) => setDesk(event.target.value)}
            placeholder="08031234567 or 2348031234567"
            className="min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
          />
        </Field>
        <Field label="Reply window (hours)">
          <input
            required
            inputMode="numeric"
            min={1}
            max={168}
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            className="min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
          />
        </Field>
        <Field label="Church desk payment instructions">
          <textarea
            required
            rows={4}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            className="w-full rounded-lg border-2 border-navy px-3 py-3 text-lg"
          />
        </Field>
        <fieldset>
          <legend className="mb-2 text-base font-bold text-navy">
            Pickup batches
          </legend>
          <div className="space-y-3">
            {batches.map((batch, index) => (
              <div key={index} className="flex gap-2">
                <input
                  required
                  value={batch}
                  onChange={(event) =>
                    setBatches((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? event.target.value : entry,
                      ),
                    )
                  }
                  className="min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
                />
                <button
                  type="button"
                  onClick={() =>
                    setBatches((current) =>
                      current.length < 2
                        ? current
                        : current.filter((_, entryIndex) => entryIndex !== index),
                    )
                  }
                  className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-navy px-4 text-base font-bold text-navy"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setBatches((current) => [...current, "Batch: "])}
            className="mt-3 inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-navy px-4 text-base font-bold text-navy"
          >
            Add pickup batch
          </button>
        </fieldset>
      </div>
      {error ? (
        <p className="mt-4 rounded-lg bg-slate-100 p-3 text-base font-semibold" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 rounded-lg bg-emerald/10 p-3 text-base font-semibold" role="status">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-5 inline-flex min-h-12 items-center justify-center rounded-lg bg-emerald px-5 text-base font-bold text-white disabled:bg-slate-400"
      >
        {pending ? "Saving…" : "Save WhatsApp Desk Settings"}
      </button>
    </form>
  );
}

function AdminSettings() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const result = await changeAdminPassword(current, next, confirm);
    if (result) {
      setError(result);
      return;
    }
    setError(null);
    setCurrent("");
    setNext("");
    setConfirm("");
    setMessage("The admin password has been changed on this browser.");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 max-w-xl rounded-2xl border-2 border-navy bg-white p-5"
    >
      <h2 className="text-2xl font-bold text-navy">Admin password</h2>
      <p className="mt-2 text-lg leading-relaxed">
        Change the password used by the admin login. A refresh keeps you
        signed in until you press Logout.
      </p>
      <div className="mt-4 space-y-4">
        <Field label="Current password">
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            className="min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
          />
        </Field>
        <Field label="New password">
          <input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            className="min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
          />
        </Field>
        <Field label="Confirm new password">
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
          />
        </Field>
      </div>
      {error ? (
        <p className="mt-4 rounded-lg bg-slate-100 p-3 text-base font-semibold" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 rounded-lg bg-emerald/10 p-3 text-base font-semibold" role="status">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        className="mt-5 inline-flex min-h-12 items-center justify-center rounded-lg bg-champions px-5 text-base font-bold text-white"
      >
        Save new password
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-base font-bold">{label}</span>
      {children}
    </label>
  );
}

function AdminItemCard({
  item,
  onUpdate,
  onDelete,
}: {
  item: CatalogItem;
  onUpdate: (patch: Partial<CatalogItem>) => void;
  onDelete: () => void;
}) {
  const percent =
    item.totalStock === 0
      ? 0
      : Math.min(100, Math.round((item.bookedStock / item.totalStock) * 100));

  return (
    <li className="rounded-2xl border-2 border-navy/15 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <ItemVisual imageUrl={item.imageUrl} name={item.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-navy">{item.name}</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-base font-bold text-navy">
              {item.category}
            </span>
            <span
              className={
                item.isActive
                  ? "rounded-full bg-emerald px-3 py-1 text-base font-bold text-white"
                  : "rounded-full bg-slate-700 px-3 py-1 text-base font-bold text-white"
              }
            >
              {item.isActive ? "Showing on public portal" : "Hidden from public"}
            </span>
          </div>
          <p className="mt-2 text-lg font-bold text-champions">
            Public ticket fee now: {formatNaira(item.ticketPrice)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <NumberField
          label="Ticket Price / Fee (₦) [Shown to Public]"
          value={item.ticketPrice}
          min={0}
          onCommit={(ticketPrice) => {
            if (ticketPrice === "") return;
            onUpdate({ ticketPrice });
          }}
        />
        <NumberField
          label="Post-Ticket Item Cost (₦) [Hidden Until Ticket Paid]"
          value={item.subsidizedItemCost ?? ""}
          min={0}
          allowEmpty
          onCommit={(subsidizedItemCost) =>
            onUpdate({
              subsidizedItemCost:
                subsidizedItemCost === "" ? undefined : subsidizedItemCost,
            })
          }
        />
        <div>
          <p className="mb-1 text-base font-bold text-navy">
            Max Tickets Per Family
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={`Lower family limit for ${item.name}`}
              onClick={() =>
                onUpdate({
                  maxPerHousehold: Math.max(1, item.maxPerHousehold - 1),
                })
              }
              className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-navy text-2xl font-bold text-white"
            >
              −
            </button>
            <span className="min-w-8 text-center text-2xl font-bold">
              {item.maxPerHousehold}
            </span>
            <button
              type="button"
              aria-label={`Raise family limit for ${item.name}`}
              onClick={() =>
                onUpdate({ maxPerHousehold: item.maxPerHousehold + 1 })
              }
              className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-navy text-2xl font-bold text-white"
            >
              +
            </button>
          </div>
        </div>
        <NumberField
          label="Total Secret Stock"
          value={item.totalStock}
          min={0}
          onCommit={(totalStock) => {
            if (totalStock === "") return;
            onUpdate({ totalStock });
          }}
        />
      </div>

      <div className="mt-5 rounded-2xl bg-slate-100 p-4">
        <p className="text-base font-bold text-navy">
          Secret stock — never shown to the public
        </p>
        <p className="mt-2 text-lg font-bold">
          Booked {item.bookedStock} / Total stock {item.totalStock}
        </p>
        <div
          className="mt-3 h-4 overflow-hidden rounded-full bg-white"
          aria-hidden="true"
        >
          <div
            className="h-full bg-champions"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-4 max-w-xs">
          <NumberField
            label="Booked so far (secret)"
            value={item.bookedStock}
            min={0}
            onCommit={(bookedStock) => {
              if (bookedStock === "") return;
              onUpdate({ bookedStock });
            }}
          />
        </div>
      </div>

      <div className="mt-5">
        <ImagePicker
          value={item.imageUrl}
          onChange={(imageUrl) => onUpdate({ imageUrl })}
        />
      </div>

      <label className="mt-5 flex min-h-12 items-center gap-3 text-base font-bold text-navy">
        <input
          type="checkbox"
          checked={item.allowNonMembers !== false}
          onChange={(event) =>
            onUpdate({ allowNonMembers: event.target.checked })
          }
          className="h-6 w-6"
        />
        Guests may book this item
      </label>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => onUpdate({ isActive: !item.isActive })}
          className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-navy bg-white px-5 text-base font-bold text-navy"
        >
          {item.isActive ? "Hide / Unavailable" : "Show on Public Portal"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-red-800 px-5 text-base font-bold text-white"
        >
          Delete / Remove Item
        </button>
      </div>
    </li>
  );
}

function NumberField({
  label,
  value,
  min,
  allowEmpty = false,
  onCommit,
}: {
  label: string;
  value: number | "";
  min: number;
  allowEmpty?: boolean;
  onCommit: (value: number | "") => void;
}) {
  const [text, setText] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);

  if (value !== lastValue) {
    setLastValue(value);
    setText(value === "" ? "" : String(value));
  }

  function commit(nextText: string) {
    if (allowEmpty && nextText.trim() === "") {
      onCommit("");
      return;
    }
    const parsed = Number(nextText);
    if (!Number.isFinite(parsed)) {
      setText(value === "" ? "" : String(value));
      return;
    }
    onCommit(Math.max(min, Math.round(parsed)));
  }

  return (
    <label className="block">
      <span className="mb-1 block text-base font-bold text-navy">{label}</span>
      <input
        inputMode="numeric"
        value={text}
        onChange={(event) => {
          const nextText = event.target.value;
          setText(nextText);
          if (allowEmpty && nextText.trim() === "") return;
          if (/^\d+$/.test(nextText)) commit(nextText);
        }}
        onBlur={() => commit(text)}
        className="min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
      />
    </label>
  );
}
