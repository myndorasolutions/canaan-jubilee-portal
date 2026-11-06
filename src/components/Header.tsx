import Image from "next/image";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-navy text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/canaan-logo.png"
            alt="Canaan Ministries dove logo"
            width={3468}
            height={3138}
            priority
            className="brand-logo shrink-0"
          />
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight text-white sm:text-2xl">
              Canaan Jubilee Auction Portal
            </p>
            <p className="mt-1 text-base leading-snug text-white">
              Canaan Ministries (a.k.a. Champions&apos; Church) — Annual
              Jubilee Auction Ticket Booking
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
