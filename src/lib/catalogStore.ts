"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Catalog adapter. Uses Supabase when the public env keys are set.
 * Otherwise the same screens keep working from localStorage.
 */
export const CATALOG_STORAGE_KEY = "canaan-jubilee-catalog-v1";
const HOUSEHOLD_STORAGE_KEY = "canaan-jubilee-households-v1";
const SETTINGS_STORAGE_KEY = "canaan-jubilee-settings-v1";
const DEVICE_TOKEN_KEY = "canaan-device-token";
const DEVICE_BOOKED_KEY = "canaan-device-booked";
const CATALOG_CHANGE_EVENT = "canaan-catalog-change";

export const SAME_DEVICE_FLAG =
  "⚠️ SAME DEVICE USED FOR MULTIPLE REGISTRATIONS";
const SIMILAR_ADDRESS_FLAG = "⚠️ SIMILAR HOME ADDRESS";
const SAME_REFEREE_FLAG = "⚠️ SAME REFEREE PHONE NUMBER";

export const CATEGORIES = [
  "Grains & Staples",
  "Cooking Essentials",
  "Livestock & Frozen",
  "Household Items",
] as const;

export const BUILT_IN_IMAGES = [
  { id: "icon:wheat", label: "Grains" },
  { id: "icon:bean", label: "Beans" },
  { id: "icon:droplets", label: "Oil" },
  { id: "icon:package", label: "Pack" },
  { id: "icon:drumstick", label: "Poultry" },
  { id: "icon:beef", label: "Meat" },
  { id: "icon:fish", label: "Fish" },
  { id: "icon:basket", label: "Household" },
] as const;

export type CatalogItem = {
  id: string;
  name: string;
  category: string;
  /** Ticket fee shown on the public portal. */
  ticketPrice: number;
  /**
   * Subsidized Jubilee price of the goods. Staff catalog only.
   * Never copy this onto a booking, slip, lookup, or WhatsApp message.
   */
  subsidizedItemCost?: number;
  maxPerHousehold: number;
  /** Secret. Admin only. */
  totalStock: number;
  /** Secret. Admin only. */
  bookedStock: number;
  isActive: boolean;
  imageUrl: string;
  /** When false, guests cannot book this item. Defaults to allowed. */
  allowNonMembers?: boolean;
};

export type CatalogState = {
  portalOpen: boolean;
  items: CatalogItem[];
};

export type PublicCatalogItem = {
  id: string;
  name: string;
  category: string;
  ticketPrice: number;
  maxPerHousehold: number;
  imageUrl: string;
  isAvailable: boolean;
  /** When false, guests cannot select this item. */
  allowNonMembers: boolean;
};

export type HouseholdCategory = "MEMBER" | "GUEST";

export type HouseholdStatus =
  | "PENDING_VERIFICATION"
  | "ACCREDITED"
  | "PAID_ISSUED"
  | "EXPIRED"
  | "REJECTED";

export type TicketPaymentMethod = "CASH" | "POS" | "TRANSFER";

export type BookingLine = {
  productId: string;
  productName: string;
  quantity: number;
  ticketUnitPrice: number;
};

export type HouseholdBooking = {
  id: string;
  referenceCode: string;
  fullName: string;
  whatsappNumber: string;
  ninOrVoterId: string;
  category: HouseholdCategory;
  churchUnitOrReferee: string;
  homeAddress: string;
  selfieDataUrl: string;
  deviceHash: string;
  duplicateFlags: string[];
  items: BookingLine[];
  totalTicketFee: number;
  status: HouseholdStatus;
  createdAt: string;
  expiresAt: string;
  whatsappInitiated: boolean;
  verificationHash: string;
  pickupBatch: string;
  rejectionReason: string;
  adminNote: string;
  paidAt: string;
  paymentMethod: TicketPaymentMethod | "";
  issuedBy: string;
};

export type SystemSettings = {
  whatsappDeskNumber: string;
  replyWindowHours: number;
  churchPaymentInstructions: string;
  pickupBatches: string[];
};

export const DEFAULT_SETTINGS: SystemSettings = {
  whatsappDeskNumber: "2348000000000",
  replyWindowHours: 72,
  churchPaymentInstructions:
    "After accreditation, pay the total ticket fee at the Canaan Ministries church desk and collect your physical tickets during your assigned pickup batch. Bring this confirmation slip and a photo ID that matches the head of household.",
  pickupBatches: [
    "Batch A: 9:00 AM - 11:00 AM",
    "Batch B: 11:00 AM - 1:00 PM",
    "Batch C: 1:00 PM - 3:00 PM",
  ],
};

export type HouseholdDraft = {
  fullName: string;
  whatsappNumber: string;
  ninOrVoterId: string;
  category: HouseholdCategory;
  churchUnitOrReferee: string;
  homeAddress: string;
  selfieDataUrl: string;
  items: { productId: string; quantity: number }[];
};

export type BookingProblem = {
  code: "WHATSAPP" | "NIN" | "DEVICE" | "STOCK" | "FORM";
  message: string;
};

const SEED_ITEMS: CatalogItem[] = [
  {
    id: "rice-50kg",
    name: "50kg Bag of Rice",
    category: "Grains & Staples",
    ticketPrice: 2000,
    subsidizedItemCost: 42500,
    maxPerHousehold: 1,
    totalStock: 40,
    bookedStock: 8,
    isActive: true,
    imageUrl: "icon:wheat",
  },
  {
    id: "beans-10kg",
    name: "10kg Beans",
    category: "Grains & Staples",
    ticketPrice: 1000,
    subsidizedItemCost: 9000,
    maxPerHousehold: 2,
    totalStock: 30,
    bookedStock: 4,
    isActive: true,
    imageUrl: "icon:bean",
  },
  {
    id: "vegetable-oil-5l",
    name: "5L Vegetable Oil",
    category: "Cooking Essentials",
    ticketPrice: 1500,
    subsidizedItemCost: 8000,
    maxPerHousehold: 1,
    totalStock: 25,
    bookedStock: 25,
    isActive: true,
    imageUrl: "icon:droplets",
  },
  {
    id: "semovita-10kg",
    name: "Semovita (10kg)",
    category: "Grains & Staples",
    ticketPrice: 500,
    subsidizedItemCost: 4500,
    maxPerHousehold: 2,
    totalStock: 50,
    bookedStock: 6,
    isActive: true,
    imageUrl: "icon:package",
  },
  {
    id: "live-chicken",
    name: "Live Chicken",
    category: "Livestock & Frozen",
    ticketPrice: 2500,
    subsidizedItemCost: 6500,
    maxPerHousehold: 1,
    totalStock: 18,
    bookedStock: 3,
    isActive: true,
    imageUrl: "icon:drumstick",
  },
  {
    id: "indomie-carton",
    name: "Carton of Indomie",
    category: "Household Items",
    ticketPrice: 800,
    subsidizedItemCost: 7500,
    maxPerHousehold: 1,
    totalStock: 35,
    bookedStock: 10,
    isActive: true,
    imageUrl: "icon:basket",
  },
];

export const SEED_CATALOG: CatalogState = {
  portalOpen: true,
  items: SEED_ITEMS,
};

function toMoney(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}

function cloneCatalog(state: CatalogState): CatalogState {
  return {
    portalOpen: state.portalOpen,
    items: state.items.map((item) => ({ ...item })),
  };
}

function sanitize(value: unknown): CatalogState | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { portalOpen?: unknown; items?: unknown };
  if (!Array.isArray(record.items)) return null;

  const items: CatalogItem[] = [];
  for (const entry of record.items) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Partial<CatalogItem>;
    if (typeof item.id !== "string" || typeof item.name !== "string") continue;

    const totalStock = Math.max(0, Math.round(Number(item.totalStock) || 0));
    const bookedStock = Math.min(
      totalStock,
      Math.max(0, Math.round(Number(item.bookedStock) || 0)),
    );
    const rawCost = item.subsidizedItemCost;
    const subsidizedItemCost =
      rawCost == null || rawCost === ("" as unknown)
        ? undefined
        : toMoney(Number(rawCost));

    items.push({
      id: item.id,
      name: item.name.trim() || "Untitled item",
      category:
        typeof item.category === "string" && item.category.trim()
          ? item.category.trim()
          : "Household Items",
      ticketPrice: toMoney(Number(item.ticketPrice)),
      subsidizedItemCost,
      maxPerHousehold: Math.max(1, Math.round(Number(item.maxPerHousehold) || 1)),
      totalStock,
      bookedStock,
      isActive: item.isActive !== false,
      allowNonMembers: item.allowNonMembers !== false,
      imageUrl:
        typeof item.imageUrl === "string" && item.imageUrl
          ? item.imageUrl
          : "icon:package",
    });
  }

  return {
    portalOpen: record.portalOpen !== false,
    items,
  };
}

export function normalizeDeskNumber(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (/^0\d{10}$/.test(digits)) return `234${digits.slice(1)}`;
  if (/^234\d{10}$/.test(digits)) return digits;
  return null;
}

export function readSettings(): SystemSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(settings: SystemSettings) {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function sanitizeSettings(value: unknown): SystemSettings {
  const row = value && typeof value === "object" ? (value as Partial<SystemSettings>) : {};
  const hours = Math.round(Number(row.replyWindowHours));
  const batches = Array.isArray(row.pickupBatches)
    ? row.pickupBatches
        .filter((batch): batch is string => typeof batch === "string")
        .map((batch) => batch.trim())
        .filter((batch) => batch.length > 0)
    : [];
  const desk = normalizeDeskNumber(String(row.whatsappDeskNumber ?? ""));
  const instructions =
    typeof row.churchPaymentInstructions === "string"
      ? row.churchPaymentInstructions.trim()
      : "";
  return {
    whatsappDeskNumber: desk ?? DEFAULT_SETTINGS.whatsappDeskNumber,
    replyWindowHours:
      Number.isFinite(hours) && hours >= 1 && hours <= 168
        ? hours
        : DEFAULT_SETTINGS.replyWindowHours,
    churchPaymentInstructions:
      instructions || DEFAULT_SETTINGS.churchPaymentInstructions,
    pickupBatches: batches.length > 0 ? batches : DEFAULT_SETTINGS.pickupBatches,
  };
}

type SettingsRow = {
  reply_window_hours?: number | null;
  whatsapp_desk_number?: string | null;
  church_payment_instructions?: string | null;
  pickup_batches?: string[] | null;
};

function mergeSettings(local: SystemSettings, row: SettingsRow | null): SystemSettings {
  if (!row) return local;
  return sanitizeSettings({
    whatsappDeskNumber: row.whatsapp_desk_number || local.whatsappDeskNumber,
    replyWindowHours: row.reply_window_hours ?? local.replyWindowHours,
    churchPaymentInstructions:
      row.church_payment_instructions || local.churchPaymentInstructions,
    pickupBatches:
      row.pickup_batches && row.pickup_batches.length > 0
        ? row.pickup_batches
        : local.pickupBatches,
  });
}

async function readCloudSettings(table: "public_settings_view" | "system_settings") {
  const local = readSettings();
  const db = getSupabase();
  if (!db) return local;
  const columns =
    "reply_window_hours, whatsapp_desk_number, church_payment_instructions, pickup_batches";
  const full = await db.from(table).select(columns).eq("id", 1).maybeSingle();
  if (!full.error) return mergeSettings(local, full.data as SettingsRow | null);
  const basic = await db
    .from(table)
    .select("reply_window_hours, whatsapp_desk_number")
    .eq("id", 1)
    .maybeSingle();
  if (basic.error) return local;
  return mergeSettings(local, basic.data as SettingsRow | null);
}

export function readCatalog(): CatalogState {
  if (typeof window === "undefined") return cloneCatalog(SEED_CATALOG);
  try {
    const raw = window.localStorage.getItem(CATALOG_STORAGE_KEY);
    if (!raw) {
      const seeded = cloneCatalog(SEED_CATALOG);
      window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return sanitize(JSON.parse(raw)) ?? cloneCatalog(SEED_CATALOG);
  } catch {
    return cloneCatalog(SEED_CATALOG);
  }
}

export type StorageMode = "local" | "supabase";

type StoreSnapshot = {
  catalog: CatalogState;
  publicItems: PublicCatalogItem[];
  households: HouseholdBooking[];
  settings: SystemSettings;
  mode: StorageMode;
  configured: boolean;
  ready: boolean;
  cloudError: string | null;
};

const INITIAL_SNAPSHOT: StoreSnapshot = {
  catalog: SEED_CATALOG,
  publicItems: [],
  households: [],
  settings: DEFAULT_SETTINGS,
  mode: "local",
  configured: false,
  ready: false,
  cloudError: null,
};

let snapshot: StoreSnapshot = INITIAL_SNAPSHOT;
let storageLoaded = false;

function toPublicList(catalog: CatalogState) {
  return catalog.items.filter((item) => item.isActive).map(toPublicItem);
}

function publish(next: StoreSnapshot) {
  snapshot = next;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CATALOG_CHANGE_EVENT));
  }
}

function cloudMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "Could not reach Supabase.";
}

type ProductRow = {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  ticket_price: number | string;
  subsidized_item_cost: number | string | null;
  total_stock: number;
  booked_stock: number;
  max_per_household: number;
  allow_non_members: boolean | null;
  is_active: boolean | null;
};

type PublicProductRow = {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  ticket_price: number | string;
  max_per_household: number;
  is_active: boolean | null;
  allow_non_members: boolean | null;
  is_available: boolean | null;
};

function rowToItem(row: ProductRow): CatalogItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    imageUrl: row.image_url || "icon:package",
    ticketPrice: toMoney(Number(row.ticket_price)),
    subsidizedItemCost:
      row.subsidized_item_cost == null
        ? undefined
        : toMoney(Number(row.subsidized_item_cost)),
    totalStock: Math.max(0, Math.round(Number(row.total_stock) || 0)),
    bookedStock: Math.max(0, Math.round(Number(row.booked_stock) || 0)),
    maxPerHousehold: Math.max(1, Math.round(Number(row.max_per_household) || 1)),
    allowNonMembers: row.allow_non_members !== false,
    isActive: row.is_active !== false,
  };
}

function itemToRow(item: CatalogItem) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    image_url: item.imageUrl,
    ticket_price: item.ticketPrice,
    subsidized_item_cost: item.subsidizedItemCost ?? null,
    total_stock: item.totalStock,
    booked_stock: item.bookedStock,
    max_per_household: item.maxPerHousehold,
    allow_non_members: item.allowNonMembers !== false,
    is_active: item.isActive,
  };
}

function viewToPublic(row: PublicProductRow): PublicCatalogItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    imageUrl: row.image_url || "icon:package",
    ticketPrice: toMoney(Number(row.ticket_price)),
    maxPerHousehold: Math.max(1, Math.round(Number(row.max_per_household) || 1)),
    isAvailable: row.is_available === true,
    allowNonMembers: row.allow_non_members !== false,
  };
}

function readLocalCatalog(cloudError: string | null = null): StoreSnapshot {
  const catalog = readCatalog();
  return {
    catalog,
    publicItems: toPublicList(catalog),
    households: readHouseholds(),
    settings: readSettings(),
    mode: "local",
    configured: isSupabaseConfigured(),
    ready: true,
    cloudError,
  };
}

async function readBookingOpen() {
  const db = getSupabase();
  if (!db) return true;
  const { data, error } = await db
    .from("system_settings")
    .select("booking_open")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data?.booking_open !== false;
}

export async function loadPublicCloud() {
  if (!isSupabaseConfigured()) return;
  const db = getSupabase();
  if (!db) return;
  try {
    const [products, portalOpen, settings] = await Promise.all([
      db.from("public_products_view").select("*"),
      readBookingOpen(),
      readCloudSettings("system_settings"),
    ]);
    if (products.error) throw products.error;
    const publicItems = ((products.data ?? []) as PublicProductRow[])
      .filter((row) => row.is_active !== false)
      .map(viewToPublic);
    publish({
      ...snapshot,
      catalog: { ...snapshot.catalog, portalOpen },
      publicItems,
      settings,
      mode: "supabase",
      configured: true,
      ready: true,
      cloudError: null,
    });
  } catch (error) {
    publish(readLocalCatalog(cloudMessage(error)));
  }
}

export async function loadAdminCloud() {
  if (!isSupabaseConfigured()) return;
  const db = getSupabase();
  if (!db) return;
  try {
    const [products, portalOpen, settings] = await Promise.all([
      db
        .from("products")
        .select("*")
        .order("created_at", { ascending: true }),
      readBookingOpen(),
      readCloudSettings("system_settings"),
    ]);
    if (products.error) throw products.error;
    const items = ((products.data ?? []) as ProductRow[]).map(rowToItem);
    const catalog = { portalOpen, items };
    const households = await readCloudHouseholds();
    writeSettings(settings);
    publish({
      catalog,
      publicItems: toPublicList(catalog),
      households,
      settings,
      mode: "supabase",
      configured: true,
      ready: true,
      cloudError: null,
    });
  } catch (error) {
    publish(readLocalCatalog(cloudMessage(error)));
  }
}

const PRODUCT_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function savedLocalItems() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CATALOG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = sanitize(JSON.parse(raw));
    if (!parsed || parsed.items.length === 0) return null;
    return parsed.items;
  } catch {
    return null;
  }
}

export async function seedCloudCatalog(): Promise<string | null> {
  const db = getSupabase();
  if (!db) return "Supabase is not connected on this browser.";
  const existing = await db.from("products").select("id").limit(1);
  if (existing.error) {
    rememberCloudError(existing.error);
    return existing.error.message;
  }
  if (existing.data && existing.data.length > 0) {
    return "The cloud catalog already has products.";
  }
  const saved = savedLocalItems();
  const source = saved ?? SEED_ITEMS.map((item) => ({ ...item, bookedStock: 0 }));
  const rows = source.map((item) =>
    itemToRow({
      ...item,
      id: PRODUCT_UUID.test(item.id) ? item.id : crypto.randomUUID(),
      bookedStock: saved ? item.bookedStock : 0,
    }),
  );
  const inserted = await insertAdjusting("products", rows);
  if (inserted) {
    rememberCloudError(new Error(inserted));
    return inserted;
  }
  const settings = await db.from("system_settings").select("id").eq("id", 1).maybeSingle();
  if (settings.error) {
    rememberCloudError(settings.error);
    return settings.error.message;
  }
  if (!settings.data) {
    const created = await insertAdjusting("system_settings", [
      {
        id: 1,
        program_title: "Canaan Jubilee Auction Portal",
        reply_window_hours: DEFAULT_SETTINGS.replyWindowHours,
        booking_open: true,
        whatsapp_desk_number: DEFAULT_SETTINGS.whatsappDeskNumber,
        church_payment_instructions: DEFAULT_SETTINGS.churchPaymentInstructions,
        pickup_batches: DEFAULT_SETTINGS.pickupBatches,
      },
    ]);
    if (created) {
      rememberCloudError(new Error(created));
      return created;
    }
  }
  await loadAdminCloud();
  return null;
}

function missingColumnName(error: unknown) {
  const message = cloudMessage(error);
  const quoted = message.match(/'([a-z0-9_]+)' column/i);
  if (quoted) return quoted[1];
  const plain = message.match(/column [\w.]+\.([a-z0-9_]+) does not exist/i);
  return plain ? plain[1] : null;
}

function withoutColumn(rows: Record<string, unknown>[], column: string) {
  return rows.map((row) => {
    const next = { ...row };
    delete next[column];
    return next;
  });
}

async function insertAdjusting(
  table: "products" | "system_settings",
  rows: Record<string, unknown>[],
) {
  const db = getSupabase();
  if (!db) return "Supabase is not connected on this browser.";
  let payload = rows.map((row) => ({ ...row }));
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await db.from(table).insert(payload);
    if (!result.error) return null;
    const column = missingColumnName(result.error);
    if (!column || !payload.some((row) => column in row)) return cloudMessage(result.error);
    payload = withoutColumn(payload, column);
  }
  return "Could not reach Supabase.";
}

async function updateAdjusting(
  table: "products" | "households" | "system_settings",
  row: Record<string, unknown>,
  matchColumn: string,
  matchValue: string,
) {
  const db = getSupabase();
  if (!db) return "Supabase is not connected on this browser.";
  let payload = { ...row };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await db.from(table).update(payload).eq(matchColumn, matchValue);
    if (!result.error) return null;
    const column = missingColumnName(result.error);
    if (!column || !(column in payload)) return cloudMessage(result.error);
    payload = withoutColumn([payload], column)[0];
  }
  return "Could not reach Supabase.";
}

async function persistPortalOpen(portalOpen: boolean) {
  const db = getSupabase();
  if (!db) return;
  const { data, error } = await db
    .from("system_settings")
    .update({ booking_open: portalOpen })
    .eq("id", 1)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    const inserted = await db.from("system_settings").insert({
      id: 1,
      program_title: "Canaan Jubilee Auction Portal",
      reply_window_hours: 72,
      booking_open: portalOpen,
      whatsapp_desk_number: DEFAULT_SETTINGS.whatsappDeskNumber,
      church_payment_instructions: DEFAULT_SETTINGS.churchPaymentInstructions,
      pickup_batches: DEFAULT_SETTINGS.pickupBatches,
    });
    if (inserted.error) throw inserted.error;
  }
}

async function persistInsert(item: CatalogItem) {
  const error = await insertAdjusting("products", [itemToRow(item)]);
  if (error) throw new Error(error);
}

async function persistUpdate(item: CatalogItem) {
  const error = await updateAdjusting("products", itemToRow(item), "id", item.id);
  if (error) throw new Error(error);
}

async function persistDelete(id: string) {
  const db = getSupabase();
  if (!db) return;
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) throw error;
}

async function persistClear() {
  const db = getSupabase();
  if (!db) return;
  const { error } = await db
    .from("products")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw error;
}

function rememberCloudError(error: unknown) {
  publish({
    ...snapshot,
    cloudError: cloudMessage(error),
  });
}

function getSnapshot() {
  if (!storageLoaded && typeof window !== "undefined") {
    storageLoaded = true;
    snapshot = isSupabaseConfigured()
      ? {
          catalog: { portalOpen: true, items: [] },
          publicItems: [],
          households: readHouseholds(),
          settings: readSettings(),
          mode: "supabase",
          configured: true,
          ready: false,
          cloudError: null,
        }
      : readLocalCatalog();
  }
  return snapshot;
}

function getServerSnapshot() {
  return INITIAL_SNAPSHOT;
}

function subscribe(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (
      (event.key !== CATALOG_STORAGE_KEY &&
        event.key !== HOUSEHOLD_STORAGE_KEY &&
        event.key !== SETTINGS_STORAGE_KEY) ||
      snapshot.mode === "supabase"
    ) {
      return;
    }
    snapshot = readLocalCatalog(snapshot.cloudError);
    onStoreChange();
  };
  const onChange = () => onStoreChange();

  window.addEventListener("storage", onStorage);
  window.addEventListener(CATALOG_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CATALOG_CHANGE_EVENT, onChange);
  };
}

function commitCatalog(next: CatalogState) {
  const catalog = cloneCatalog(next);
  if (snapshot.mode !== "supabase") {
    window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalog));
  }
  publish({
    ...snapshot,
    catalog,
    publicItems: toPublicList(catalog),
    ready: true,
  });
}

export function writeCatalog(state: CatalogState) {
  storageLoaded = true;
  commitCatalog(state);
}

export function formatNaira(amount: number) {
  return `₦${toMoney(amount).toLocaleString("en-NG")}`;
}

export function quotaLabel(maxPerHousehold: number) {
  const count = Math.max(1, maxPerHousehold);
  return `Max ${count} ${count === 1 ? "Ticket" : "Tickets"} Per Family`;
}

export function toPublicItem(item: CatalogItem): PublicCatalogItem {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    ticketPrice: item.ticketPrice,
    maxPerHousehold: item.maxPerHousehold,
    imageUrl: item.imageUrl,
    isAvailable: item.totalStock - item.bookedStock > 0,
    allowNonMembers: item.allowNonMembers !== false,
  };
}

function normalizeItem(
  item: Omit<CatalogItem, "id" | "bookedStock"> & {
    id?: string;
    bookedStock?: number;
  },
): CatalogItem {
  const totalStock = Math.max(0, Math.round(item.totalStock) || 0);
  return {
    ...item,
    id: item.id ?? crypto.randomUUID(),
    name: item.name.trim() || "Untitled item",
    bookedStock: Math.min(
      totalStock,
      Math.max(0, Math.round(item.bookedStock ?? 0) || 0),
    ),
    ticketPrice: toMoney(item.ticketPrice),
    subsidizedItemCost:
      item.subsidizedItemCost == null
        ? undefined
        : toMoney(item.subsidizedItemCost),
    maxPerHousehold: Math.max(1, Math.round(item.maxPerHousehold) || 1),
    totalStock,
    allowNonMembers: item.allowNonMembers !== false,
    isActive: item.isActive !== false,
  };
}

export function useCatalog() {
  const current = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    if (current.configured) void loadAdminCloud();
  }, [current.configured]);

  function commit(updater: (catalog: CatalogState) => CatalogState) {
    commitCatalog(updater(getSnapshot().catalog));
  }

  return {
    catalog: current.catalog,
    mode: current.mode,
    configured: current.configured,
    ready: current.ready,
    cloudError: current.cloudError,
    households: current.households,
    settings: current.settings,
    setPortalOpen(portalOpen: boolean) {
      commit((catalog) => ({ ...catalog, portalOpen }));
      if (getSnapshot().mode === "supabase") {
        void persistPortalOpen(portalOpen).catch(rememberCloudError);
      }
    },
    addItem(item: Omit<CatalogItem, "id" | "bookedStock">) {
      const nextItem = normalizeItem(item);
      commit((catalog) => ({
        ...catalog,
        items: [...catalog.items, nextItem],
      }));
      if (getSnapshot().mode === "supabase") {
        void persistInsert(nextItem).catch(rememberCloudError);
      }
    },
    updateItem(id: string, patch: Partial<CatalogItem>) {
      let updated: CatalogItem | null = null;
      commit((catalog) => ({
        ...catalog,
        items: catalog.items.map((item) => {
          if (item.id !== id) return item;
          updated = normalizeItem({ ...item, ...patch, id: item.id });
          if (!("subsidizedItemCost" in patch)) {
            updated = { ...updated, subsidizedItemCost: item.subsidizedItemCost };
          }
          return updated;
        }),
      }));
      if (updated && getSnapshot().mode === "supabase") {
        void persistUpdate(updated).catch(rememberCloudError);
      }
    },
    deleteItem(id: string) {
      commit((catalog) => ({
        ...catalog,
        items: catalog.items.filter((item) => item.id !== id),
      }));
      if (getSnapshot().mode === "supabase") {
        void persistDelete(id).catch(rememberCloudError);
      }
    },
    clearAllItems() {
      commit((catalog) => ({ ...catalog, items: [] }));
      if (getSnapshot().mode === "supabase") {
        void persistClear().catch(rememberCloudError);
      }
    },
  };
}

export function usePublicCatalog() {
  const current = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    if (current.configured) void loadPublicCloud();
  }, [current.configured]);

  const items =
    current.mode === "supabase"
      ? current.publicItems
      : current.catalog.items.filter((item) => item.isActive).map(toPublicItem);

  return {
    ready: current.ready,
    portalOpen: current.catalog.portalOpen,
    settings: current.settings,
    items,
  };
}

export async function saveSystemSettings(input: SystemSettings): Promise<string | null> {
  const desk = normalizeDeskNumber(input.whatsappDeskNumber);
  if (!desk) {
    return "Enter the church WhatsApp number as 080… or 234…, for example 08031234567.";
  }
  const settings = sanitizeSettings({ ...input, whatsappDeskNumber: desk });
  getSnapshot();
  writeSettings(settings);
  publish({ ...getSnapshot(), settings, ready: true });
  if (getSnapshot().mode !== "supabase") return null;
  const db = getSupabase();
  if (!db) return "Supabase is not connected on this browser.";
  const payload = {
    whatsapp_desk_number: settings.whatsappDeskNumber,
    reply_window_hours: settings.replyWindowHours,
    church_payment_instructions: settings.churchPaymentInstructions,
    pickup_batches: settings.pickupBatches,
  };
  const updated = await updateAdjusting("system_settings", payload, "id", "1");
  if (updated) {
    rememberCloudError(new Error(updated));
    return updated;
  }
  const existing = await db.from("system_settings").select("id").eq("id", 1).maybeSingle();
  if (existing.error) {
    rememberCloudError(existing.error);
    return existing.error.message;
  }
  if (!existing.data) {
    const inserted = await insertAdjusting("system_settings", [
      {
        id: 1,
        program_title: "Canaan Jubilee Auction Portal",
        booking_open: getSnapshot().catalog.portalOpen,
        ...payload,
      },
    ]);
    if (inserted) {
      rememberCloudError(new Error(inserted));
      return inserted;
    }
  }
  return null;
}

const STATUSES: HouseholdStatus[] = [
  "PENDING_VERIFICATION",
  "ACCREDITED",
  "PAID_ISSUED",
  "EXPIRED",
  "REJECTED",
];

type CloudBookingItem = {
  product_id: string;
  quantity: number;
  ticket_unit_price: number | string;
  products: { name: string } | { name: string }[] | null;
};

type CloudHouseholdRow = {
  id: string;
  reference_code: string;
  full_name: string;
  whatsapp_number: string;
  nin_or_voter_id: string;
  category: string;
  church_unit_or_referee: string | null;
  home_address: string | null;
  selfie_url: string | null;
  device_hash: string | null;
  duplicate_flags: string[] | null;
  status: string;
  created_at: string;
  expires_at: string;
  whatsapp_initiated?: boolean | null;
  verification_hash?: string | null;
  pickup_batch?: string | null;
  rejection_reason?: string | null;
  admin_note?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
  issued_by?: string | null;
  booking_items: CloudBookingItem[] | null;
};

export function normalizeWhatsapp(input: string): string | null {
  const compact = input.replace(/[^\d+]/g, "");
  let digits = compact;
  if (digits.startsWith("+234")) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith("234") && digits.length === 13) digits = `0${digits.slice(3)}`;
  if (!/^0\d{10}$/.test(digits)) return null;
  return digits;
}

export function normalizeIdentity(input: string): string | null {
  const compact = input.replace(/[\s-]/g, "").toUpperCase();
  if (/^\d{11}$/.test(compact)) return compact;
  if (/^[A-Z0-9]{8,22}$/.test(compact)) return compact;
  return null;
}

export function statusLabel(status: HouseholdStatus) {
  switch (status) {
    case "PENDING_VERIFICATION":
      return "Pending verification";
    case "ACCREDITED":
      return "Accredited";
    case "PAID_ISSUED":
      return "Paid and tickets issued";
    case "EXPIRED":
      return "Expired";
    case "REJECTED":
      return "Rejected";
  }
}

export function holdRemaining(expiresAt: string, now = Date.now()) {
  const ms = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return "Hold expired";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s left of the confirmation window`;
}

export function formatDeadline(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function bookingQrValue(booking: HouseholdBooking) {
  return [
    "CANAAN-JUBILEE",
    booking.referenceCode,
    booking.verificationHash,
    booking.status,
    booking.pickupBatch,
  ].join("|");
}

export function whatsappDeskLink(booking: HouseholdBooking, settings: SystemSettings) {
  const desk = normalizeDeskNumber(settings.whatsappDeskNumber) ?? DEFAULT_SETTINGS.whatsappDeskNumber;
  const category = booking.category === "MEMBER" ? "Member" : "Guest";
  const tickets = booking.items
    .map((line) => `${line.productName} x ${line.quantity}`)
    .join(", ");
  const message = [
    "Canaan Jubilee household confirmation",
    `Reference: #${booking.referenceCode}`,
    `Name: ${booking.fullName}`,
    `Category: ${category}`,
    `Unit leader or referee: ${booking.churchUnitOrReferee}`,
    `Reserved tickets: ${tickets}`,
    `Total Ticket Fee: ${formatNaira(booking.totalTicketFee)}`,
    `Verification hash: ${booking.verificationHash}`,
    `${settings.replyWindowHours}-hour window ends: ${formatDeadline(booking.expiresAt)}`,
  ].join("\n");
  return `https://wa.me/${desk}?text=${encodeURIComponent(message)}`;
}

function blocksAnotherRegistration(booking: HouseholdBooking) {
  return booking.status !== "REJECTED";
}

function readHouseholds(): HouseholdBooking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HOUSEHOLD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeHousehold)
      .filter((booking): booking is HouseholdBooking => booking !== null);
  } catch {
    return [];
  }
}

function writeHouseholds(households: HouseholdBooking[]) {
  window.localStorage.setItem(HOUSEHOLD_STORAGE_KEY, JSON.stringify(households));
}

function sanitizeHousehold(value: unknown): HouseholdBooking | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<HouseholdBooking>;
  if (typeof row.id !== "string" || typeof row.referenceCode !== "string") return null;
  if (typeof row.fullName !== "string" || typeof row.whatsappNumber !== "string") return null;
  const category = row.category === "GUEST" ? "GUEST" : "MEMBER";
  const status = STATUSES.includes(row.status as HouseholdStatus)
    ? (row.status as HouseholdStatus)
    : "PENDING_VERIFICATION";
  const items = Array.isArray(row.items)
    ? row.items.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const line = entry as Partial<BookingLine>;
        if (typeof line.productId !== "string") return [];
        const quantity = Math.max(0, Math.round(Number(line.quantity) || 0));
        if (quantity < 1) return [];
        return [
          {
            productId: line.productId,
            productName:
              typeof line.productName === "string" && line.productName
                ? line.productName
                : "Jubilee item",
            quantity,
            ticketUnitPrice: toMoney(Number(line.ticketUnitPrice) || 0),
          },
        ];
      })
    : [];
  return {
    id: row.id,
    referenceCode: row.referenceCode,
    fullName: row.fullName,
    whatsappNumber: row.whatsappNumber,
    ninOrVoterId: typeof row.ninOrVoterId === "string" ? row.ninOrVoterId : "",
    category,
    churchUnitOrReferee:
      typeof row.churchUnitOrReferee === "string" ? row.churchUnitOrReferee : "",
    homeAddress: typeof row.homeAddress === "string" ? row.homeAddress : "",
    selfieDataUrl: typeof row.selfieDataUrl === "string" ? row.selfieDataUrl : "",
    deviceHash: typeof row.deviceHash === "string" ? row.deviceHash : "",
    duplicateFlags: Array.isArray(row.duplicateFlags)
      ? row.duplicateFlags.filter((flag): flag is string => typeof flag === "string")
      : [],
    items,
    totalTicketFee: toMoney(Number(row.totalTicketFee) || 0),
    status,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
    expiresAt: typeof row.expiresAt === "string" ? row.expiresAt : new Date().toISOString(),
    whatsappInitiated: row.whatsappInitiated === true,
    verificationHash:
      typeof row.verificationHash === "string" && row.verificationHash
        ? row.verificationHash
        : fallbackHash(row.referenceCode),
    pickupBatch: typeof row.pickupBatch === "string" ? row.pickupBatch : "",
    rejectionReason: typeof row.rejectionReason === "string" ? row.rejectionReason : "",
    adminNote: typeof row.adminNote === "string" ? row.adminNote : "",
    paidAt: typeof row.paidAt === "string" ? row.paidAt : "",
    paymentMethod: paymentMethodOf(row.paymentMethod),
    issuedBy: typeof row.issuedBy === "string" ? row.issuedBy : "",
  };
}

function paymentMethodOf(value: unknown): TicketPaymentMethod | "" {
  if (value === "CASH" || value === "POS" || value === "TRANSFER") return value;
  return "";
}

function fallbackHash(reference: string) {
  let hash = 2166136261;
  for (const char of reference) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(0, 8);
}

async function makeVerificationHash(reference: string, phone: string, createdAt: string) {
  const data = new TextEncoder().encode(`${reference}|${phone}|${createdAt}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .slice(0, 4)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function productNameOf(nested: CloudBookingItem["products"]) {
  if (!nested) return "Jubilee item";
  if (Array.isArray(nested)) return nested[0]?.name || "Jubilee item";
  return nested.name || "Jubilee item";
}

function rowToHousehold(row: CloudHouseholdRow): HouseholdBooking {
  const items = (row.booking_items ?? []).map((line) => ({
    productId: line.product_id,
    productName: productNameOf(line.products),
    quantity: Math.max(1, Math.round(Number(line.quantity) || 1)),
    ticketUnitPrice: toMoney(Number(line.ticket_unit_price) || 0),
  }));
  const booking = sanitizeHousehold({
    id: row.id,
    referenceCode: row.reference_code,
    fullName: row.full_name,
    whatsappNumber: row.whatsapp_number,
    ninOrVoterId: row.nin_or_voter_id,
    category: row.category === "GUEST" ? "GUEST" : "MEMBER",
    churchUnitOrReferee: row.church_unit_or_referee ?? "",
    homeAddress: row.home_address ?? "",
    selfieDataUrl: row.selfie_url ?? "",
    deviceHash: row.device_hash ?? "",
    duplicateFlags: row.duplicate_flags ?? [],
    items,
    totalTicketFee: items.reduce(
      (sum, line) => sum + line.quantity * line.ticketUnitPrice,
      0,
    ),
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    whatsappInitiated: row.whatsapp_initiated === true,
    verificationHash: row.verification_hash ?? "",
    pickupBatch: row.pickup_batch ?? "",
    rejectionReason: row.rejection_reason ?? "",
    adminNote: row.admin_note ?? "",
    paidAt: row.paid_at ?? "",
    paymentMethod: paymentMethodOf(row.payment_method),
    issuedBy: row.issued_by ?? "",
  });
  return booking ?? {
    id: row.id,
    referenceCode: row.reference_code,
    fullName: row.full_name,
    whatsappNumber: row.whatsapp_number,
    ninOrVoterId: row.nin_or_voter_id,
    category: "MEMBER",
    churchUnitOrReferee: "",
    homeAddress: "",
    selfieDataUrl: "",
    deviceHash: "",
    duplicateFlags: [],
    items: [],
    totalTicketFee: 0,
    status: "PENDING_VERIFICATION",
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    whatsappInitiated: false,
    verificationHash: "",
    pickupBatch: "",
    rejectionReason: "",
    adminNote: "",
    paidAt: "",
    paymentMethod: "",
    issuedBy: "",
  };
}

async function readCloudHouseholds() {
  const db = getSupabase();
  if (!db) return readHouseholds();
  const { data, error } = await db
    .from("households")
    .select(
      "id, reference_code, full_name, whatsapp_number, nin_or_voter_id, category, church_unit_or_referee, home_address, selfie_url, device_hash, duplicate_flags, status, created_at, expires_at, whatsapp_initiated, verification_hash, pickup_batch, rejection_reason, admin_note, paid_at, payment_method, issued_by, booking_items(product_id, quantity, ticket_unit_price, products(name))",
    )
    .order("created_at", { ascending: false });
  if (error || !data) return readHouseholds();
  const households = (data as CloudHouseholdRow[]).map(rowToHousehold);
  writeHouseholds(households);
  return households;
}

export async function getDeviceHash() {
  let token = window.localStorage.getItem(DEVICE_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_TOKEN_KEY, token);
  }
  const traits = [
    token,
    navigator.userAgent,
    navigator.language,
    String(navigator.hardwareConcurrency || 0),
    Intl.DateTimeFormat().resolvedOptions().timeZone || "",
  ].join("|");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(traits),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function addressTokens(address: string) {
  const stop = new Set([
    "street", "st", "road", "rd", "close", "crescent", "avenue", "ave",
    "lane", "area", "estate", "lagos", "nigeria", "house", "number",
    "near", "behind", "opposite", "beside", "off", "via", "the", "and",
    "compound", "quarters", "layout", "phase", "block",
  ]);
  return address
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stop.has(token) && !/^\d+$/.test(token));
}

function similarAddress(left: string, right: string) {
  const a = new Set(addressTokens(left));
  const b = new Set(addressTokens(right));
  if (a.size < 2 || b.size < 2) return false;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  const shorter = Math.min(a.size, b.size);
  return shared >= 2 && shared / shorter >= 0.6;
}

function phonesIn(text: string) {
  const found = new Set<string>();
  for (const match of text.match(/(?:\+?234|0)\d{10}/g) ?? []) {
    const phone = normalizeWhatsapp(match);
    if (phone) found.add(phone);
  }
  return found;
}

function makeReference(existing: Set<string>) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const code = `CJA-${String(Math.floor(1000 + Math.random() * 9000))}`;
    if (!existing.has(code)) return code;
  }
  return `CJA-${String(Date.now()).slice(-6)}`;
}

function problem(code: BookingProblem["code"], message: string): BookingProblem {
  return { code, message };
}

function saveBookingState(catalog: CatalogState, households: HouseholdBooking[]) {
  writeHouseholds(households);
  if (snapshot.mode !== "supabase") {
    window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalog));
  }
  publish({
    ...snapshot,
    catalog,
    publicItems:
      snapshot.mode === "supabase" ? snapshot.publicItems : toPublicList(catalog),
    households,
    ready: true,
  });
}

function patchHousehold(id: string, patch: Partial<HouseholdBooking>) {
  getSnapshot();
  const current = getSnapshot().households;
  const existing = current.find((booking) => booking.id === id);
  if (!existing) return null;
  const nextBooking = sanitizeHousehold({ ...existing, ...patch }) ?? {
    ...existing,
    ...patch,
  };
  const households = current.map((booking) =>
    booking.id === id ? nextBooking : booking,
  );
  writeHouseholds(households);
  publish({ ...getSnapshot(), households });
  if (getSnapshot().mode === "supabase") {
    void persistHouseholdPatch(nextBooking).catch(rememberCloudError);
  }
  return nextBooking;
}

async function persistHouseholdPatch(booking: HouseholdBooking) {
  const error = await updateAdjusting(
    "households",
    {
      status: booking.status,
      whatsapp_initiated: booking.whatsappInitiated,
      verification_hash: booking.verificationHash,
      pickup_batch: booking.pickupBatch,
      rejection_reason: booking.rejectionReason,
      admin_note: booking.adminNote,
      expires_at: booking.expiresAt,
      paid_at: booking.paidAt || null,
      payment_method: booking.paymentMethod || null,
      issued_by: booking.issuedBy,
    },
    "id",
    booking.id,
  );
  if (error) throw new Error(error);
}

export function markWhatsappInitiated(id: string) {
  return patchHousehold(id, { whatsappInitiated: true });
}

export function updateHouseholdDesk(
  id: string,
  patch: Partial<Pick<HouseholdBooking, "status" | "pickupBatch" | "rejectionReason">>,
) {
  return patchHousehold(id, patch);
}

function holdsReservedStock(status: HouseholdStatus) {
  return status === "PENDING_VERIFICATION" || status === "ACCREDITED";
}

function windowMs() {
  const hours = Math.max(1, getSnapshot().settings.replyWindowHours || 72);
  return hours * 60 * 60 * 1000;
}

function buyerPhone(booking: HouseholdBooking) {
  return normalizeDeskNumber(booking.whatsappNumber);
}

export function accreditationWhatsappUrl(booking: HouseholdBooking) {
  const phone = buyerPhone(booking);
  if (!phone) return null;
  const message = `Congratulations ${booking.fullName}! Your household booking (#${booking.referenceCode}) for the Canaan Jubilee Auction Portal has been ACCREDITED. Assigned Ticket Payment & Collection Batch: ${booking.pickupBatch}. Total Ticket Fee to pay at the Church Desk: ${formatNaira(booking.totalTicketFee)}. Please present this message and your code #${booking.referenceCode} within ${getSnapshot().settings.replyWindowHours} hours. Powered by Myndora Solutions Ltd.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function rejectionWhatsappUrl(booking: HouseholdBooking) {
  const phone = buyerPhone(booking);
  if (!phone) return null;
  const message = `Hello ${booking.fullName}. Your Canaan Jubilee household booking #${booking.referenceCode} was not accredited. ${booking.rejectionReason} Please contact the church desk if you believe this was a mistake. Powered by Myndora Solutions Ltd.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function replaceHousehold(booking: HouseholdBooking) {
  return getSnapshot().households.map((entry) =>
    entry.id === booking.id ? booking : entry,
  );
}

function persistReleasedItems(items: CatalogItem[]) {
  if (getSnapshot().mode !== "supabase") return;
  for (const item of items) {
    void persistUpdate(item).catch(rememberCloudError);
  }
}

export function accreditHousehold(
  bookingId: string,
  assignedBatch: string,
  adminNote: string,
) {
  getSnapshot();
  const existing = getSnapshot().households.find((booking) => booking.id === bookingId);
  if (!existing) return null;
  const next = sanitizeHousehold({
    ...existing,
    status: "ACCREDITED",
    pickupBatch: assignedBatch.trim(),
    adminNote: adminNote.trim(),
    expiresAt: new Date(Date.now() + windowMs()).toISOString(),
  });
  if (!next) return null;
  saveBookingState(getSnapshot().catalog, replaceHousehold(next));
  if (getSnapshot().mode === "supabase") {
    void persistHouseholdPatch(next).catch(rememberCloudError);
  }
  return { booking: next, whatsappUrl: accreditationWhatsappUrl(next) };
}

export function physicalTicketLabel(line: BookingLine) {
  return `${line.quantity}x ${line.productName} Ticket`;
}

export function ticketReceiptWhatsappUrl(booking: HouseholdBooking) {
  const phone = buyerPhone(booking);
  if (!phone) return null;
  const tickets = booking.items.map(physicalTicketLabel).join(", ");
  const message = [
    `Canaan Jubilee Ticket Receipt for ${booking.fullName}.`,
    `Your household booking (#${booking.referenceCode}) ticket fee has been paid.`,
    `Paid Ticket Fee: ${formatNaira(booking.totalTicketFee)}.`,
    `Physical labeled tickets issued: ${tickets}.`,
    "Present these physical tickets at the Point of Sale to purchase your items.",
    "Powered by Myndora Solutions Ltd.",
  ].join(" ");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function markTicketsPaidAndIssued(
  bookingId: string,
  paymentMethod: TicketPaymentMethod,
  cashierName: string,
) {
  getSnapshot();
  const existing = getSnapshot().households.find((booking) => booking.id === bookingId);
  if (!existing || existing.status !== "ACCREDITED") return null;
  const next = sanitizeHousehold({
    ...existing,
    status: "PAID_ISSUED",
    paidAt: new Date().toISOString(),
    paymentMethod,
    issuedBy: cashierName.trim(),
  });
  if (!next) return null;
  saveBookingState(getSnapshot().catalog, replaceHousehold(next));
  if (getSnapshot().mode === "supabase") {
    void persistHouseholdPatch(next).catch(rememberCloudError);
  }
  return { booking: next, whatsappUrl: ticketReceiptWhatsappUrl(next) };
}

export function findCashierBookings(query: string) {
  getSnapshot();
  const trimmed = query.trim();
  if (!trimmed) return [];
  const households = getSnapshot().households;
  const bare = trimmed.replace(/^#/, "").replace(/\s+/g, "").toUpperCase();
  if (/^CJA-\d+$/.test(bare)) {
    return households.filter((booking) => booking.referenceCode.toUpperCase() === bare);
  }
  if (/^\d{4}$/.test(bare)) {
    return households.filter((booking) =>
      booking.referenceCode.toUpperCase().endsWith(bare),
    );
  }
  const phone = normalizeWhatsapp(trimmed);
  const international = normalizeDeskNumber(trimmed);
  return households.filter((booking) => {
    if (phone && booking.whatsappNumber === phone) return true;
    const stored = normalizeDeskNumber(booking.whatsappNumber);
    return Boolean(international && stored && international === stored);
  });
}

function csvCell(value: string | number) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function bookingsCsv(households: HouseholdBooking[]) {
  const headers = [
    "Reference",
    "Name",
    "WhatsApp",
    "Category",
    "Status",
    "Tickets",
    "Ticket fee",
    "Payment method",
    "Paid at",
    "Cashier",
    "Pickup batch",
    "Created at",
  ];
  const rows = households.map((booking) => [
    booking.referenceCode,
    booking.fullName,
    booking.whatsappNumber,
    booking.category === "MEMBER" ? "Church Member" : "Non-Member Guest",
    booking.status,
    booking.items.map((line) => `${line.quantity}x ${line.productName}`).join("; "),
    booking.totalTicketFee,
    booking.paymentMethod,
    booking.paidAt,
    booking.issuedBy,
    booking.pickupBatch,
    booking.createdAt,
  ]);
  return [headers, ...rows]
    .map((row) => row.map((cell) => csvCell(cell)).join(","))
    .join("\r\n");
}

export function rejectOrExpireHousehold(
  bookingId: string,
  newStatus: "REJECTED" | "EXPIRED",
  reason: string,
) {
  getSnapshot();
  const existing = getSnapshot().households.find((booking) => booking.id === bookingId);
  if (!existing || !holdsReservedStock(existing.status)) return null;
  const catalog = cloneCatalog(getSnapshot().catalog);
  const changed: CatalogItem[] = [];
  for (const line of existing.items) {
    const item = catalog.items.find((entry) => entry.id === line.productId);
    if (!item) continue;
    item.bookedStock = Math.max(0, item.bookedStock - line.quantity);
    changed.push({ ...item });
  }
  const next = sanitizeHousehold({
    ...existing,
    status: newStatus,
    rejectionReason: reason.trim(),
  });
  if (!next) return null;
  saveBookingState(catalog, replaceHousehold(next));
  if (getSnapshot().mode === "supabase") {
    void persistHouseholdPatch(next).catch(rememberCloudError);
    persistReleasedItems(changed);
  }
  return { booking: next, whatsappUrl: rejectionWhatsappUrl(next) };
}

export function extendHouseholdWindow(bookingId: string, extraHours = 24) {
  getSnapshot();
  const existing = getSnapshot().households.find((booking) => booking.id === bookingId);
  if (!existing) return null;
  const hours = Math.max(1, Math.round(extraHours) || 24);
  const base = new Date(existing.expiresAt).getTime();
  const next = sanitizeHousehold({
    ...existing,
    expiresAt: new Date(
      (Number.isFinite(base) ? base : Date.now()) + hours * 60 * 60 * 1000,
    ).toISOString(),
  });
  if (!next) return null;
  saveBookingState(getSnapshot().catalog, replaceHousehold(next));
  if (getSnapshot().mode === "supabase") {
    void persistHouseholdPatch(next).catch(rememberCloudError);
  }
  return next;
}

export function simulateHouseholdExpiry(bookingId: string) {
  getSnapshot();
  const existing = getSnapshot().households.find((booking) => booking.id === bookingId);
  if (!existing || !holdsReservedStock(existing.status)) return null;
  const next = sanitizeHousehold({
    ...existing,
    expiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
  });
  if (!next) return null;
  saveBookingState(getSnapshot().catalog, replaceHousehold(next));
  if (getSnapshot().mode === "supabase") {
    void persistHouseholdPatch(next).catch(rememberCloudError);
  }
  return next;
}

export function releaseAllExpiredBookings() {
  getSnapshot();
  const now = Date.now();
  const due = getSnapshot().households.filter(
    (booking) =>
      holdsReservedStock(booking.status) &&
      new Date(booking.expiresAt).getTime() < now,
  );
  if (due.length === 0) return [];
  const catalog = cloneCatalog(getSnapshot().catalog);
  const changed = new Map<string, CatalogItem>();
  const dueIds = new Set(due.map((booking) => booking.id));
  for (const booking of due) {
    for (const line of booking.items) {
      const item = catalog.items.find((entry) => entry.id === line.productId);
      if (!item) continue;
      item.bookedStock = Math.max(0, item.bookedStock - line.quantity);
      changed.set(item.id, { ...item });
    }
  }
  const households = getSnapshot().households.map((booking) => {
    if (!dueIds.has(booking.id)) return booking;
    return (
      sanitizeHousehold({
        ...booking,
        status: "EXPIRED",
        rejectionReason:
          booking.rejectionReason || "The confirmation window lapsed before accreditation.",
      }) ?? booking
    );
  });
  saveBookingState(catalog, households);
  const released = households.filter((booking) => dueIds.has(booking.id));
  if (getSnapshot().mode === "supabase") {
    for (const booking of released) {
      void persistHouseholdPatch(booking).catch(rememberCloudError);
    }
    persistReleasedItems([...changed.values()]);
  }
  return released;
}

export function surnameOf(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter((part) => part.length > 1);
  return parts.length > 0 ? parts[parts.length - 1].toLowerCase() : "";
}

export function householdVettingNotes(
  booking: HouseholdBooking,
  households: HouseholdBooking[],
) {
  const others = households.filter(
    (entry) => entry.id !== booking.id && holdsReservedStock(entry.status),
  );
  const red = [...booking.duplicateFlags];
  if (
    booking.deviceHash &&
    others.some((entry) => entry.deviceHash === booking.deviceHash) &&
    !red.includes(SAME_DEVICE_FLAG)
  ) {
    red.push(SAME_DEVICE_FLAG);
  }
  if (
    others.some((entry) => similarAddress(booking.homeAddress, entry.homeAddress)) &&
    !red.includes(SIMILAR_ADDRESS_FLAG)
  ) {
    red.push(SIMILAR_ADDRESS_FLAG);
  }
  const phones = phonesIn(booking.churchUnitOrReferee);
  if (
    [...phones].some((phone) =>
      others.some((entry) => phonesIn(entry.churchUnitOrReferee).has(phone)),
    ) &&
    !red.includes(SAME_REFEREE_FLAG)
  ) {
    red.push(SAME_REFEREE_FLAG);
  }
  const surname = surnameOf(booking.fullName);
  const surnameOthers = surname
    ? households.filter(
        (entry) => entry.id !== booking.id && surnameOf(entry.fullName) === surname,
      ).length
    : 0;
  return { red, surnameOthers };
}

export type CommitteeGroupMode = "none" | "surname" | "anchor" | "address";

export function groupHouseholds(
  list: HouseholdBooking[],
  mode: CommitteeGroupMode,
) {
  const newest = [...list].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
  if (mode === "none") return [{ title: "", bookings: newest }];

  if (mode === "surname" || mode === "anchor") {
    const map = new Map<string, HouseholdBooking[]>();
    for (const booking of newest) {
      const raw =
        mode === "surname"
          ? surnameOf(booking.fullName)
          : booking.churchUnitOrReferee.trim();
      const title = raw
        ? raw.charAt(0).toUpperCase() + raw.slice(1)
        : mode === "surname"
          ? "No surname"
          : "No unit or referee";
      const bucket = map.get(title) ?? [];
      bucket.push(booking);
      map.set(title, bucket);
    }
    return [...map.entries()].map(([title, bookings]) => ({ title, bookings }));
  }

  const parent = newest.map((_, index) => index);
  const find = (index: number): number => {
    if (parent[index] !== index) parent[index] = find(parent[index]);
    return parent[index];
  };
  const unite = (left: number, right: number) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent[a] = b;
  };
  for (let left = 0; left < newest.length; left += 1) {
    for (let right = left + 1; right < newest.length; right += 1) {
      const sameDevice =
        Boolean(newest[left].deviceHash) &&
        newest[left].deviceHash === newest[right].deviceHash;
      if (
        sameDevice ||
        similarAddress(newest[left].homeAddress, newest[right].homeAddress)
      ) {
        unite(left, right);
      }
    }
  }
  const groups = new Map<number, HouseholdBooking[]>();
  newest.forEach((booking, index) => {
    const root = find(index);
    const bucket = groups.get(root) ?? [];
    bucket.push(booking);
    groups.set(root, bucket);
  });
  return [...groups.values()].map((bookings) => ({
    title:
      bookings.length > 1
        ? `Shared address or device (${bookings.length} households)`
        : bookings[0].homeAddress || "Single household",
    bookings,
  }));
}

export type VerifiedProfile = {
  fullName: string;
  whatsappNumber: string;
  ninOrVoterId: string;
  category: HouseholdCategory;
  churchUnitOrReferee: string;
  homeAddress: string;
  selfieDataUrl: string;
};

function validateProfile(
  draft: Omit<HouseholdDraft, "items">,
): { ok: true; profile: VerifiedProfile } | { ok: false; error: BookingProblem } {
  const fullName = draft.fullName.trim().replace(/\s+/g, " ");
  const nameParts = fullName.split(" ").filter((part) => part.length > 1);
  if (nameParts.length < 2) {
    return {
      ok: false,
      error: problem("FORM", "Enter the surname and first name of the head of household."),
    };
  }
  const whatsappNumber = normalizeWhatsapp(draft.whatsappNumber);
  if (!whatsappNumber) {
    return {
      ok: false,
      error: problem(
        "FORM",
        "Enter an active WhatsApp number with 11 digits, such as 08031234567.",
      ),
    };
  }
  const ninOrVoterId = normalizeIdentity(draft.ninOrVoterId);
  if (!ninOrVoterId) {
    return {
      ok: false,
      error: problem(
        "FORM",
        "Enter an 11-digit NIN, or the number on the Voter's Card.",
      ),
    };
  }
  const homeAddress = draft.homeAddress.trim().replace(/\s+/g, " ");
  if (homeAddress.length < 8) {
    return {
      ok: false,
      error: problem(
        "FORM",
        "Enter the house number, street, area, and a nearby landmark.",
      ),
    };
  }
  const churchUnitOrReferee = draft.churchUnitOrReferee.trim().replace(/\s+/g, " ");
  if (churchUnitOrReferee.length < 3) {
    return {
      ok: false,
      error: problem(
        "FORM",
        draft.category === "GUEST"
          ? "Enter the church member who vouches for this guest, and that member's phone number."
          : "Enter the church department or home cell, and the unit leader's name.",
      ),
    };
  }
  if (!draft.selfieDataUrl.startsWith("data:image/")) {
    return {
      ok: false,
      error: problem("FORM", "Take or upload a clear photo of the head of household."),
    };
  }
  return {
    ok: true,
    profile: {
      fullName,
      whatsappNumber,
      ninOrVoterId,
      category: draft.category,
      churchUnitOrReferee,
      homeAddress,
      selfieDataUrl: draft.selfieDataUrl,
    },
  };
}

function existingTicketBooking(phone: string, nin: string) {
  return (
    readHouseholds().find(
      (booking) =>
        blocksAnotherRegistration(booking) &&
        booking.items.length > 0 &&
        (booking.whatsappNumber === phone || booking.ninOrVoterId === nin),
    ) ?? null
  );
}

export function verifyHouseholdGate(draft: Omit<HouseholdDraft, "items">):
  | { ok: true; profile: VerifiedProfile }
  | { ok: false; error: BookingProblem; existing?: HouseholdBooking } {
  getSnapshot();
  const checked = validateProfile(draft);
  if (!checked.ok) return checked;
  if (!getSnapshot().catalog.portalOpen) {
    return {
      ok: false,
      error: problem("FORM", "Registration is not open yet. Please check back."),
    };
  }
  const existing = existingTicketBooking(
    checked.profile.whatsappNumber,
    checked.profile.ninOrVoterId,
  );
  if (existing) {
    const samePhone = existing.whatsappNumber === checked.profile.whatsappNumber;
    return {
      ok: false,
      existing,
      error: problem(
        samePhone ? "WHATSAPP" : "NIN",
        samePhone
          ? `This WhatsApp number has already been registered for a household (Ref: #${existing.referenceCode}). Only one registration is permitted per household.`
          : "This NIN / Voter's Card number has already been used for another registration.",
      ),
    };
  }
  return checked;
}

export async function submitHouseholdBooking(
  draft: HouseholdDraft,
  options: { elderlyAssist: boolean },
): Promise<{ ok: true; booking: HouseholdBooking } | { ok: false; error: BookingProblem }> {
  getSnapshot();
  const checked = validateProfile(draft);
  if (!checked.ok) return checked;
  const {
    fullName,
    whatsappNumber,
    ninOrVoterId,
    churchUnitOrReferee,
    homeAddress,
  } = checked.profile;
  const requested = draft.items.filter((line) => line.quantity > 0);
  if (requested.length === 0) {
    return {
      ok: false,
      error: problem("FORM", "Choose at least one Jubilee item before you submit."),
    };
  }

  const catalog = cloneCatalog(getSnapshot().catalog);
  if (!catalog.portalOpen) {
    return {
      ok: false,
      error: problem("FORM", "Registration is not open yet. Please check back."),
    };
  }

  const households = readHouseholds();
  const whatsappHit = households.find(
    (booking) =>
      blocksAnotherRegistration(booking) && booking.whatsappNumber === whatsappNumber,
  );
  if (whatsappHit) {
    return {
      ok: false,
      error: problem(
        "WHATSAPP",
        `This WhatsApp number has already been registered for a household (Ref: #${whatsappHit.referenceCode}). Only one registration is permitted per household.`,
      ),
    };
  }
  const ninHit = households.find(
    (booking) =>
      blocksAnotherRegistration(booking) && booking.ninOrVoterId === ninOrVoterId,
  );
  if (ninHit) {
    return {
      ok: false,
      error: problem(
        "NIN",
        "This NIN / Voter's Card number has already been used for another registration.",
      ),
    };
  }

  const deviceHash = await getDeviceHash();
  const storedRef = window.localStorage.getItem(DEVICE_BOOKED_KEY);
  if (
    storedRef &&
    !households.some(
      (booking) =>
        blocksAnotherRegistration(booking) && booking.referenceCode === storedRef,
    )
  ) {
    window.localStorage.removeItem(DEVICE_BOOKED_KEY);
  }
  const sameDevice = households.filter(
    (booking) =>
      blocksAnotherRegistration(booking) &&
      (booking.deviceHash === deviceHash ||
        (storedRef !== null && booking.referenceCode === storedRef)),
  );
  if (sameDevice.length > 0 && !options.elderlyAssist) {
    return {
      ok: false,
      error: problem(
        "DEVICE",
        `This phone has already registered a household (Ref: #${sameDevice[0].referenceCode}). Only one registration is allowed on the same phone.`,
      ),
    };
  }

  const lines: BookingLine[] = [];
  for (const request of requested) {
    const item = catalog.items.find((entry) => entry.id === request.productId);
    if (!item || !item.isActive) {
      return {
        ok: false,
        error: problem("STOCK", "One of the chosen items is no longer on the portal."),
      };
    }
    const quantity = Math.round(request.quantity);
    if (quantity > item.maxPerHousehold) {
      return {
        ok: false,
        error: problem("FORM", `You can only book ${item.maxPerHousehold} ticket(s) for ${item.name}.`),
      };
    }
    if (draft.category === "GUEST" && item.allowNonMembers === false) {
      return {
        ok: false,
        error: problem("FORM", `${item.name} is for church members only.`),
      };
    }
    if (quantity > item.totalStock - item.bookedStock) {
      return {
        ok: false,
        error: problem(
          "STOCK",
          `${item.name} is fully booked. Please remove it and try again.`,
        ),
      };
    }
    lines.push({
      productId: item.id,
      productName: item.name,
      quantity,
      ticketUnitPrice: item.ticketPrice,
    });
  }

  const duplicateFlags: string[] = [];
  if (sameDevice.length > 0) duplicateFlags.push(SAME_DEVICE_FLAG);
  if (
    households.some(
      (booking) =>
        blocksAnotherRegistration(booking) &&
        similarAddress(booking.homeAddress, homeAddress),
    )
  ) {
    duplicateFlags.push(SIMILAR_ADDRESS_FLAG);
  }
  const refereePhones = phonesIn(churchUnitOrReferee);
  if (
    [...refereePhones].some((phone) =>
      households.some(
        (booking) =>
          blocksAnotherRegistration(booking) &&
          phonesIn(booking.churchUnitOrReferee).has(phone),
      ),
    )
  ) {
    duplicateFlags.push(SAME_REFEREE_FLAG);
  }

  const createdAt = new Date();
  const windowHours = Math.max(1, getSnapshot().settings.replyWindowHours || 72);
  const booking: HouseholdBooking = {
    id: crypto.randomUUID(),
    referenceCode: makeReference(new Set(households.map((entry) => entry.referenceCode))),
    fullName,
    whatsappNumber,
    ninOrVoterId,
    category: draft.category,
    churchUnitOrReferee,
    homeAddress,
    selfieDataUrl: draft.selfieDataUrl,
    deviceHash,
    duplicateFlags,
    items: lines,
    totalTicketFee: lines.reduce((sum, line) => sum + line.quantity * line.ticketUnitPrice, 0),
    status: "PENDING_VERIFICATION",
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + windowHours * 60 * 60 * 1000).toISOString(),
    whatsappInitiated: false,
    verificationHash: "",
    pickupBatch: "",
    rejectionReason: "",
    adminNote: "",
    paidAt: "",
    paymentMethod: "",
    issuedBy: "",
  };

  if (getSnapshot().mode === "supabase") {
    const remote = await persistCloudBooking(booking);
    if (!remote.ok) return remote;
    booking.id = remote.id;
    booking.referenceCode = remote.referenceCode;
    booking.expiresAt = remote.expiresAt;
  }
  booking.verificationHash = await makeVerificationHash(
    booking.referenceCode,
    booking.whatsappNumber,
    booking.createdAt,
  );
  if (getSnapshot().mode === "supabase") {
    const db = getSupabase();
    if (db) {
      await db
        .from("households")
        .update({ verification_hash: booking.verificationHash })
        .eq("id", booking.id);
    }
  }
  if (getSnapshot().mode !== "supabase") {
    for (const line of lines) {
      const item = catalog.items.find((entry) => entry.id === line.productId);
      if (item) item.bookedStock += line.quantity;
    }
  }

  const stamped = households.map((entry) => {
    if (
      sameDevice.some((match) => match.id === entry.id) &&
      !entry.duplicateFlags.includes(SAME_DEVICE_FLAG)
    ) {
      return { ...entry, duplicateFlags: [...entry.duplicateFlags, SAME_DEVICE_FLAG] };
    }
    return entry;
  });
  const nextHouseholds = [booking, ...stamped];
  saveBookingState(catalog, nextHouseholds);
  if (!window.localStorage.getItem(DEVICE_BOOKED_KEY)) {
    window.localStorage.setItem(DEVICE_BOOKED_KEY, booking.referenceCode);
  }
  if (getSnapshot().mode === "supabase") void loadPublicCloud();
  return { ok: true, booking };
}

async function persistCloudBooking(
  booking: HouseholdBooking,
): Promise<
  | { ok: true; id: string; referenceCode: string; expiresAt: string }
  | { ok: false; error: BookingProblem }
> {
  const db = getSupabase();
  if (!db) {
    return { ok: false, error: problem("FORM", "Supabase is not connected on this browser.") };
  }
  const { data, error } = await db.rpc("submit_household_booking", {
    p_full_name: booking.fullName,
    p_whatsapp_number: booking.whatsappNumber,
    p_nin_or_voter_id: booking.ninOrVoterId,
    p_category: booking.category,
    p_church_unit_or_referee: booking.churchUnitOrReferee,
    p_home_address: booking.homeAddress,
    p_selfie_url: booking.selfieDataUrl,
    p_device_hash: booking.deviceHash,
    p_duplicate_flags: booking.duplicateFlags,
    p_items: booking.items.map((line) => ({
      product_id: line.productId,
      quantity: line.quantity,
    })),
  });
  if (error) {
    const text = error.message || "";
    const whatsapp = text.match(/WHATSAPP:([A-Z0-9-]+)/);
    if (whatsapp) {
      return {
        ok: false,
        error: problem(
          "WHATSAPP",
          `This WhatsApp number has already been registered for a household (Ref: #${whatsapp[1]}). Only one registration is permitted per household.`,
        ),
      };
    }
    if (text.includes("NIN_DUPLICATE")) {
      return {
        ok: false,
        error: problem(
          "NIN",
          "This NIN / Voter's Card number has already been used for another registration.",
        ),
      };
    }
    if (/fully booked/i.test(text)) {
      return { ok: false, error: problem("STOCK", text) };
    }
    return { ok: false, error: problem("FORM", text) };
  }
  const payload = data as {
    household_id?: string;
    reference_code?: string;
    expires_at?: string;
  } | null;
  if (!payload?.household_id || !payload.reference_code || !payload.expires_at) {
    return { ok: false, error: problem("FORM", "The booking was saved, but the reference did not come back.") };
  }
  return {
    ok: true,
    id: payload.household_id,
    referenceCode: payload.reference_code,
    expiresAt: payload.expires_at,
  };
}

export async function findHouseholdBooking(query: string) {
  getSnapshot();
  const trimmed = query.trim();
  if (!trimmed) return null;
  const reference = trimmed.replace(/^#/, "").toUpperCase();
  const phone = normalizeWhatsapp(trimmed);
  const local = getSnapshot().households.find((booking) => {
    if (booking.referenceCode.toUpperCase() === reference) return true;
    if (phone && booking.whatsappNumber === phone) return true;
    return false;
  });
  if (local) return local;
  if (!isSupabaseConfigured()) return null;
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db.rpc("lookup_household_booking", {
    p_query: phone ?? reference,
  });
  if (error || !data) return null;
  const row = data as Partial<HouseholdBooking> & { referenceCode?: string };
  return sanitizeHousehold(row);
}
