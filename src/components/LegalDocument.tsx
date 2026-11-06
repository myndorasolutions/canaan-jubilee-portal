import type { ReactNode } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

const backClassName =
  "inline-flex min-h-12 items-center rounded-lg border-2 border-champions px-4 text-base font-bold text-champions";

function BackToWelcome() {
  return (
    <Link href="/" className={backClassName}>
      ← Back to Welcome Page
    </Link>
  );
}

export default function LegalDocument({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header />
      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-3xl px-4 pt-8">
          <BackToWelcome />
        </div>
        <article className="prose prose-lg mx-auto max-w-3xl px-4 py-10 prose-headings:text-navy prose-p:text-navy prose-li:text-navy prose-strong:text-navy">
          {children}
        </article>
        <div className="mx-auto max-w-3xl px-4 pb-10">
          <BackToWelcome />
        </div>
      </main>
      <Footer />
    </div>
  );
}
