"use client";

import { useSyncExternalStore } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

const SESSION_KEY = "canaan-admin-session";
const PASSWORD_KEY = "canaan-admin-password";
const AUTH_EVENT = "canaan-admin-auth";

export const DEFAULT_ADMIN_PASSWORD = "CanaanJubilee2026!";

function browserPasswordOverride() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PASSWORD_KEY);
}

export function configuredAdminPassword() {
  return process.env.NEXT_PUBLIC_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
}

export function isAdminAuthenticated() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(SESSION_KEY) === "ok";
}

function markSession(active: boolean) {
  if (active) window.sessionStorage.setItem(SESSION_KEY, "ok");
  else window.sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

async function sha256(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function cloudPasswordHash() {
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db
    .from("system_settings")
    .select("admin_password_hash")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data?.admin_password_hash) return null;
  return String(data.admin_password_hash);
}

async function passwordMatches(password: string) {
  const override = browserPasswordOverride();
  if (override) return password === override;

  const hash = await cloudPasswordHash();
  if (hash) return (await sha256(password)) === hash;

  return password === configuredAdminPassword();
}

export async function loginAdmin(password: string) {
  const ok = await passwordMatches(password);
  if (ok) markSession(true);
  return ok;
}

export function logoutAdmin() {
  markSession(false);
}

export async function changeAdminPassword(
  current: string,
  next: string,
  confirm: string,
) {
  if (next !== confirm) return "The new passwords do not match.";
  if (next.trim().length < 8) return "Use at least 8 characters.";
  if (!(await passwordMatches(current))) {
    return "The current password is not correct.";
  }

  window.localStorage.setItem(PASSWORD_KEY, next);

  if (isSupabaseConfigured()) {
    const db = getSupabase();
    if (db) {
      const hash = await sha256(next);
      const { error } = await db
        .from("system_settings")
        .update({ admin_password_hash: hash })
        .eq("id", 1);
      if (error) {
        return "The password was saved on this browser, but Supabase did not store the new hash. Run the SQL script, then try again.";
      }
    }
  }

  return null;
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(AUTH_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(AUTH_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function useAdminSession() {
  return useSyncExternalStore(
    subscribe,
    isAdminAuthenticated,
    () => false,
  );
}
