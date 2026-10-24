"use client";

import dynamic from "next/dynamic";

const AdminDashboard = dynamic(
  () => import("@/components/AdminDashboard"),
  {
    ssr: false,
    loading: () => (
      <p className="px-4 py-10 text-lg font-semibold text-navy">
        Loading the catalog…
      </p>
    ),
  },
);

export default function AdminPage() {
  return <AdminDashboard />;
}
