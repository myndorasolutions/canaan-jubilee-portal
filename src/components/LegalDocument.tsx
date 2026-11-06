import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default function LegalDocument({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header />
      <main className="flex-1 bg-white">
        <article className="prose prose-lg mx-auto max-w-3xl px-4 py-10 prose-headings:text-navy prose-p:text-navy prose-li:text-navy prose-strong:text-navy">
          {children}
        </article>
      </main>
      <Footer />
    </div>
  );
}
