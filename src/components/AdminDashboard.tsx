"use client";

import Link from "next/link";
import { FormEvent, Fragment, useId, useState, type ReactNode } from "react";
import AdminLogin from "@/components/AdminLogin";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { ImagePicker } from "@/components/ItemVisual";
import { useAdminSession } from "@/lib/adminAuth";
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
  memberMaxPerHousehold: string;
  guestMaxPerHousehold: string;
  memberTotalStock: string;
  guestTotalStock: string;
  imageUrl: string;
  allowNonMembers: boolean;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  category: CATEGORIES[0],
  ticketPrice: "1000",
  subsidizedItemCost: "",
  memberMaxPerHousehold: "1",
  guestMaxPerHousehold: "1",
  memberTotalStock: "10",
  guestTotalStock: "0",
  imageUrl: "icon:wheat",
  allowNonMembers: true,
};

export default function AdminDashboard() {
  const { status, logoutAdmin } = useAdminSession();
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
  } = useCatalog({ loadCloud: status === "authenticated" });
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

  if (status === "loading") {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <Header />
        <p className="px-4 py-10 text-lg font-semibold text-navy">
          Checking session…
        </p>
        <Footer />
      </div>
    );
  }

  if (status !== "authenticated") {
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
    const memberMaxPerHousehold = Number(draft.memberMaxPerHousehold);
    const guestMaxPerHousehold = Number(draft.guestMaxPerHousehold);
    const memberTotalStock = Number(draft.memberTotalStock);
    const guestTotalStock = Number(draft.guestTotalStock);
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
    if (!Number.isFinite(memberMaxPerHousehold) || memberMaxPerHousehold < 1) {
      setFormError("Member max tickets must be at least 1.");
      return;
    }
    if (!Number.isFinite(guestMaxPerHousehold) || guestMaxPerHousehold < 1) {
      setFormError("Guest max tickets must be at least 1.");
      return;
    }
    if (!Number.isFinite(memberTotalStock) || memberTotalStock < 0) {
      setFormError("Member Total Stock must be 0 or more.");
      return;
    }
    if (!Number.isFinite(guestTotalStock) || guestTotalStock < 0) {
      setFormError("Non-Member Total Stock must be 0 or more.");
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
      maxPerHousehold: memberMaxPerHousehold,
      memberMaxPerHousehold,
      guestMaxPerHousehold,
      memberTotalStock,
      guestTotalStock,
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
                onClick={() => void logoutAdmin()}
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
            ⚙️ WhatsApp Desk &amp; 5-Day Portal Settings
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
          <WhatsAppDeskSettings settings={settings} />
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

            <div className="mt-6">
              <ProductInventoryTable
                items={catalog.items}
                onUpdate={updateItem}
                onDelete={deleteItem}
              />
            </div>
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
              <Field label="Member max tickets">
                <input
                  inputMode="numeric"
                  value={draft.memberMaxPerHousehold}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      memberMaxPerHousehold: event.target.value,
                    }))
                  }
                  className="min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
                />
              </Field>
              <Field label="Guest max tickets">
                <input
                  inputMode="numeric"
                  value={draft.guestMaxPerHousehold}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      guestMaxPerHousehold: event.target.value,
                    }))
                  }
                  className="min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
                />
              </Field>
              <Field label="Member Total Stock">
                <input
                  inputMode="numeric"
                  value={draft.memberTotalStock}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      memberTotalStock: event.target.value,
                    }))
                  }
                  className="min-h-12 w-full rounded-lg border-2 border-navy px-3 text-lg"
                />
              </Field>
              <Field label="Non-Member Total Stock">
                <input
                  inputMode="numeric"
                  value={draft.guestTotalStock}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      guestTotalStock: event.target.value,
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
        ⚙️ WhatsApp Desk &amp; 5-Day Settings
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

function ProductInventoryTable({
  items,
  onUpdate,
  onDelete,
}: {
  items: CatalogItem[];
  onUpdate: (id: string, patch: Partial<CatalogItem>) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border-2 border-navy bg-white p-4 text-sm font-semibold">
        No Jubilee items yet.
      </p>
    );
  }

  const memberTotal = items.reduce((sum, item) => sum + item.memberTotalStock, 0);
  const memberBooked = items.reduce((sum, item) => sum + item.memberBookedStock, 0);
  const guestTotal = items.reduce((sum, item) => sum + item.guestTotalStock, 0);
  const guestBooked = items.reduce((sum, item) => sum + item.guestBookedStock, 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <StockSummary
          label="Member Total Stock"
          booked={memberBooked}
          total={memberTotal}
        />
        <StockSummary
          label="Non-Member Total Stock"
          booked={guestBooked}
          total={guestTotal}
        />
      </div>
      <div className="overflow-x-auto rounded-xl border-2 border-navy bg-white">
      <table className="w-full min-w-[1080px] border-collapse text-left text-sm text-navy">
        <thead>
          <tr className="border-b border-navy/20 bg-slate-50 text-xs uppercase">
            <th className="px-3 py-2 font-bold" rowSpan={2}>
              Item
            </th>
            <th className="px-3 py-2 text-center font-bold" colSpan={4}>
              Member
            </th>
            <th className="px-3 py-2 text-center font-bold" colSpan={4}>
              Non-Member (Guest)
            </th>
            <th className="px-3 py-2 font-bold" rowSpan={2}>
              Actions
            </th>
          </tr>
          <tr className="border-b border-navy/20 bg-slate-50 text-xs">
            {["Total", "Booked", "Remaining", "Max", "Total", "Booked", "Remaining", "Max"].map(
              (label, index) => (
                <th key={`${label}-${index}`} className="px-2 py-1 font-semibold">
                  {label}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <ProductInventoryRows
              key={item.id}
              item={item}
              onUpdate={(patch) => onUpdate(item.id, patch)}
              onDelete={() => {
                if (
                  window.confirm(
                    `Delete / Remove “${item.name}” from the catalog? This cannot be undone.`,
                  )
                ) {
                  onDelete(item.id);
                }
              }}
            />
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function StockSummary({
  label,
  booked,
  total,
}: {
  label: string;
  booked: number;
  total: number;
}) {
  const remaining = Math.max(0, total - booked);
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-navy/20 bg-white px-3 py-1">
      <span className="font-semibold text-slate-600">{label}</span>
      <span className="font-bold text-navy">
        Booked {booked} / Remaining {remaining}
      </span>
    </p>
  );
}

function ProductInventoryRows({
  item,
  onUpdate,
  onDelete,
}: {
  item: CatalogItem;
  onUpdate: (patch: Partial<CatalogItem>) => void;
  onDelete: () => void;
}) {
  return (
    <Fragment>
      <tr className="border-b border-slate-200 align-top">
        <td className="px-3 py-2">
          <p className="font-bold">{item.name}</p>
          <p className="text-xs text-slate-600">{item.category}</p>
          <label className="mt-1 block text-xs font-semibold">
            Ticket fee ₦
            <MiniNumber
              label={`Ticket fee for ${item.name}`}
              value={item.ticketPrice}
              min={0}
              onCommit={(ticketPrice) => onUpdate({ ticketPrice })}
            />
          </label>
        </td>
        <QuotaCells
          tone="bg-champions"
          total={item.memberTotalStock}
          booked={item.memberBookedStock}
          max={item.memberMaxPerHousehold}
          totalLabel={`Member Total Stock for ${item.name}`}
          bookedLabel={`Member booked for ${item.name}`}
          maxLabel={`Member max for ${item.name}`}
          onTotal={(memberTotalStock) => onUpdate({ memberTotalStock })}
          onBooked={(memberBookedStock) =>
            onUpdate({
              memberBookedStock: Math.min(item.memberTotalStock, memberBookedStock),
            })
          }
          onMax={(memberMaxPerHousehold) =>
            onUpdate({ memberMaxPerHousehold, maxPerHousehold: memberMaxPerHousehold })
          }
        />
        <QuotaCells
          tone="bg-navy"
          total={item.guestTotalStock}
          booked={item.guestBookedStock}
          max={item.guestMaxPerHousehold}
          totalLabel={`Non-Member Total Stock for ${item.name}`}
          bookedLabel={`Non-member booked for ${item.name}`}
          maxLabel={`Guest max for ${item.name}`}
          onTotal={(guestTotalStock) => onUpdate({ guestTotalStock })}
          onBooked={(guestBookedStock) =>
            onUpdate({
              guestBookedStock: Math.min(item.guestTotalStock, guestBookedStock),
            })
          }
          onMax={(guestMaxPerHousehold) => onUpdate({ guestMaxPerHousehold })}
        />
        <td className="px-3 py-2">
          <button
            type="button"
            onClick={() => onUpdate({ isActive: !item.isActive })}
            className={
              item.isActive
                ? "rounded-full bg-emerald px-2 py-1 text-xs font-bold text-white"
                : "rounded-full bg-slate-700 px-2 py-1 text-xs font-bold text-white"
            }
          >
            {item.isActive ? "Public" : "Hidden"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="mt-2 block rounded bg-red-800 px-2 py-1 text-xs font-bold text-white"
          >
            Delete
          </button>
        </td>
      </tr>
      <tr className="border-b border-navy/15 bg-slate-50">
        <td className="px-3 py-2" colSpan={10}>
          <div className="flex flex-wrap items-center gap-3">
            <ImagePicker
              value={item.imageUrl}
              onChange={(imageUrl) => onUpdate({ imageUrl })}
            />
            <label className="flex items-center gap-2 text-xs font-bold">
              <input
                type="checkbox"
                checked={item.allowNonMembers !== false}
                onChange={(event) =>
                  onUpdate({ allowNonMembers: event.target.checked })
                }
                className="h-4 w-4"
              />
              Guests may book
            </label>
            <label className="text-xs font-semibold">
              Hidden item cost ₦
              <MiniNumber
                label={`Hidden item cost for ${item.name}`}
                value={item.subsidizedItemCost ?? 0}
                min={0}
                onCommit={(subsidizedItemCost) => onUpdate({ subsidizedItemCost })}
              />
            </label>
          </div>
        </td>
      </tr>
    </Fragment>
  );
}

function QuotaCells({
  total,
  booked,
  max,
  tone,
  totalLabel,
  bookedLabel,
  maxLabel,
  onTotal,
  onBooked,
  onMax,
}: {
  total: number;
  booked: number;
  max: number;
  tone: string;
  totalLabel: string;
  bookedLabel: string;
  maxLabel: string;
  onTotal: (value: number) => void;
  onBooked: (value: number) => void;
  onMax: (value: number) => void;
}) {
  const [stockError, setStockError] = useState<string | null>(null);
  const remaining = Math.max(0, total - booked);
  const percent = total === 0 ? 0 : Math.min(100, Math.round((booked / total) * 100));
  const pill =
    remaining <= 0
      ? "bg-red-800 text-white"
      : total > 0 && remaining / total <= 0.25
        ? "bg-amber-200 text-navy"
        : "bg-emerald text-white";

  return (
    <>
      <td className="px-2 py-2">
        <MiniNumber
          label={totalLabel}
          value={total}
          min={0}
          cannotGoBelow={booked}
          onInvalid={setStockError}
          onCommit={(next) => {
            setStockError(null);
            onTotal(next);
          }}
        />
        {stockError ? (
          <p className="mt-1 max-w-28 text-xs font-semibold text-red-800" role="alert">
            {stockError}
          </p>
        ) : null}
      </td>
      <td className="px-2 py-2">
        <MiniNumber
          label={bookedLabel}
          value={booked}
          min={0}
          max={total}
          onCommit={onBooked}
        />
      </td>
      <td className="px-2 py-2">
        <p className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${pill}`}>
          {booked} / {total}
        </p>
        <p className="mt-1 text-xs font-semibold">Remaining {remaining}</p>
        <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
          <div className={`h-full ${tone}`} style={{ width: `${percent}%` }} />
        </div>
      </td>
      <td className="px-2 py-2">
        <MiniNumber label={maxLabel} value={max} min={1} onCommit={onMax} />
      </td>
    </>
  );
}

function MiniNumber({
  value,
  min,
  max,
  cannotGoBelow,
  label,
  onCommit,
  onInvalid,
}: {
  value: number;
  min: number;
  max?: number;
  cannotGoBelow?: number;
  label: string;
  onCommit: (value: number) => void;
  onInvalid?: (message: string | null) => void;
}) {
  const [text, setText] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);

  if (value !== lastValue) {
    setLastValue(value);
    setText(String(value));
  }

  function commit(nextText: string, live: boolean) {
    const parsed = Number(nextText);
    if (!Number.isFinite(parsed) || nextText.trim() === "") {
      if (!live) setText(String(value));
      return;
    }
    let next = Math.max(min, Math.round(parsed));
    if (max != null) next = Math.min(max, next);
    if (cannotGoBelow != null && next < cannotGoBelow) {
      if (!live) {
        onInvalid?.(`Keep at least ${cannotGoBelow} already booked.`);
        setText(String(value));
      }
      return;
    }
    onInvalid?.(null);
    setText(String(next));
    if (next !== value) onCommit(next);
  }

  return (
    <input
      aria-label={label}
      inputMode="numeric"
      value={text}
      onChange={(event) => {
        const nextText = event.target.value;
        setText(nextText);
        if (/^\d+$/.test(nextText)) commit(nextText, true);
      }}
      onBlur={() => commit(text, false)}
      className="h-8 w-16 rounded border border-navy px-2 text-sm"
    />
  );
}

