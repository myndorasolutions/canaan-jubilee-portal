"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export type AdminSessionStatus = "loading" | "anonymous" | "authenticated";

const LEGACY_SESSION_KEY = "canaan-admin-session";
const LEGACY_PASSWORD_KEY = "canaan-admin-password";

function clearLegacyPassword() {
  window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
  window.localStorage.removeItem(LEGACY_PASSWORD_KEY);
}

export function useAdminSession() {
  const [status, setStatus] = useState<AdminSessionStatus>("loading");
  const generation = useRef(0);

  useEffect(() => {
    const ticket = ++generation.current;
    const db = getSupabase();
    if (!db) {
      setStatus("anonymous");
      return;
    }

    clearLegacyPassword();
    let active = true;

    void db.auth.getSession().then(({ data }) => {
      if (!active || ticket !== generation.current) return;
      setStatus(data.session ? "authenticated" : "anonymous");
    });

    const { data: subscription } = db.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setStatus(session ? "authenticated" : "anonymous");
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function logoutAdmin() {
    generation.current += 1;
    setStatus("anonymous");
    const db = getSupabase();
    if (db) await db.auth.signOut();
  }

  return {
    status,
    logoutAdmin,
    configured: isSupabaseConfigured(),
  };
}
