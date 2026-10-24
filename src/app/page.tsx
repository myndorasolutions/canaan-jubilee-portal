"use client";

import dynamic from "next/dynamic";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

const JubileeCatalog = dynamic(() => import("@/components/JubileeCatalog"), {
  ssr: false,
  loading: () => (
    <p className="mx-auto max-w-6xl px-4 py-10 text-lg font-semibold text-navy">
      Loading Jubilee items…
    </p>
  ),
});

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 pt-8 sm:pt-10">
            <p className="text-base font-bold tracking-wide text-champions uppercase">
              Canaan Ministries
            </p>
            <h1 className="mt-2 max-w-4xl text-3xl font-bold leading-tight text-navy sm:text-5xl">
              Welcome to the Canaan Jubilee Auction Portal
            </h1>
            <p className="mt-4 max-w-3xl text-xl leading-relaxed text-navy">
              Register your household first. Ticket booking stays locked
              until your details pass the identity check.
            </p>
            <p className="mt-4 max-w-3xl rounded-2xl border-4 border-champions bg-white p-5 text-lg font-bold leading-relaxed text-navy">
              IMPORTANT: The amount displayed beside each item is the Ticket Fee
              only. Your physical ticket entitles you to purchase the item at the
              heavily subsidized Jubilee price directly at the physical Point of
              Sale.
            </p>
          </div>
        </section>
        <JubileeCatalog />
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
            <ul className="grid gap-4 md:grid-cols-3">
              <li className="rounded-2xl border-2 border-navy/15 bg-slate-50 p-5">
                <h2 className="text-xl font-bold text-navy">
                  Members and guests
                </h2>
                <p className="mt-2 text-lg leading-relaxed">
                  Open to both church members and non-members (guests).
                </p>
              </li>
              <li className="rounded-2xl border-2 border-navy/15 bg-slate-50 p-5">
                <h2 className="text-xl font-bold text-navy">
                  One registration per household
                </h2>
                <p className="mt-2 text-lg leading-relaxed">
                  Strict 1-registration-per-household rule. This is verified
                  with your NIN or ID, a selfie, and your unit leader or a
                  referee.
                </p>
              </li>
              <li className="rounded-2xl border-2 border-emerald bg-emerald/10 p-5">
                <h2 className="text-xl font-bold text-navy">
                  72-hour confirmation window
                </h2>
                <p className="mt-2 text-lg leading-relaxed">
                  After you book, confirm via WhatsApp within 72 hours.
                </p>
              </li>
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
