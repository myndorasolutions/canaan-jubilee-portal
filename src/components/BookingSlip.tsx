"use client";

/* eslint-disable @next/next/no-img-element -- selfies are data URLs, which next/image cannot render */

import Image from "next/image";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  bookingQrValue,
  formatDeadline,
  formatNaira,
  holdRemaining,
  whatsappDeskLink,
  type HouseholdBooking,
  type SystemSettings,
} from "@/lib/catalogStore";

export function BookingSlip({
  booking,
  settings,
  onWhatsapp,
}: {
  booking: HouseholdBooking;
  settings: SystemSettings;
  onWhatsapp: (booking: HouseholdBooking) => void;
}) {
  const [remaining, setRemaining] = useState(() => holdRemaining(booking.expiresAt));

  useEffect(() => {
    const id = window.setInterval(
      () => setRemaining(holdRemaining(booking.expiresAt)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [booking.expiresAt]);

  const category =
    booking.category === "MEMBER" ? "Church Member" : "Non-Member Guest";
  const hours = settings.replyWindowHours;
  const whatsappHref = whatsappDeskLink(booking, settings);
  const showWhatsapp =
    booking.status === "PENDING_VERIFICATION" && !booking.whatsappInitiated;

  return (
    <article id="booking-slip" className="booking-slip mt-4 rounded-2xl border-4 border-emerald bg-white p-5 text-navy sm:p-8">
      <div className="flex items-center gap-3">
        <Image
          src="/canaan-logo.png"
          alt="Canaan Ministries dove logo"
          width={3468}
          height={3138}
          className="brand-logo"
        />
        <p className="text-lg font-bold leading-snug sm:text-xl">
          Canaan Jubilee Auction Portal — Household Booking Reserved
        </p>
      </div>
      <p className="mt-5 text-sm font-bold tracking-wide text-champions uppercase">
        Reference code
      </p>
      <h2 className="text-4xl font-bold sm:text-5xl">#{booking.referenceCode}</h2>
      <StatusBanner
        booking={booking}
        hours={hours}
        remaining={remaining}
        instructions={settings.churchPaymentInstructions}
      />
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        {booking.selfieDataUrl ? (
          <img
            src={booking.selfieDataUrl}
            alt={`Face photo of ${booking.fullName}`}
            className="h-28 w-28 shrink-0 rounded-full border-4 border-navy object-cover"
          />
        ) : null}
        <div>
          <p className="text-2xl font-bold">{booking.fullName}</p>
          <p className="mt-1 inline-flex min-h-10 items-center rounded-full bg-navy px-4 text-base font-bold text-white">
            {category}
          </p>
          <p className="mt-2 text-lg">
            {booking.category === "MEMBER" ? "Unit leader" : "Referee"}:{" "}
            {booking.churchUnitOrReferee}
          </p>
        </div>
      </div>
      <ul className="mt-5 space-y-2 text-lg">
        {booking.items.map((line) => (
          <li key={line.productId}>
            {line.quantity}x {line.productName} Ticket — Ticket Fee{" "}
            {formatNaira(line.quantity * line.ticketUnitPrice)}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-2xl font-bold">
        {booking.status === "PAID_ISSUED" ? "Paid Ticket Fee" : "Total Ticket Fee to Pay at the Desk"}
        : {formatNaira(booking.totalTicketFee)}
      </p>
      <div className="mt-6 flex flex-col items-start gap-3">
        <QRCodeSVG
          value={bookingQrValue(booking)}
          size={180}
          title={
            booking.status === "ACCREDITED"
              ? `Official QR accreditation pass for ${booking.referenceCode}`
              : `Booking QR code for ${booking.referenceCode}`
          }
          bgColor="#ffffff"
          fgColor="#0D254C"
        />
        <p className="text-base font-bold">
          {booking.status === "ACCREDITED"
            ? "Official QR Accreditation Pass"
            : "Booking QR code"}
        </p>
        <p className="text-base">Verification hash: {booking.verificationHash}</p>
      </div>
      {showWhatsapp ? (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onWhatsapp(booking)}
          className="no-print mt-6 inline-flex min-h-16 w-full items-center justify-center rounded-lg bg-emerald px-5 text-xl font-bold text-white"
        >
          1-Tap Confirm on WhatsApp
        </a>
      ) : null}
      {booking.status === "PENDING_VERIFICATION" && booking.whatsappInitiated ? (
        <p className="mt-4 rounded-lg bg-emerald/10 p-4 text-lg font-semibold">
          The church desk can see that you tapped Confirm on WhatsApp.
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => window.print()}
        className="no-print mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-lg border-2 border-navy bg-white px-5 text-lg font-bold text-navy"
      >
        Print / Save Confirmation Slip
      </button>
      <p className="mt-6 text-base font-bold text-myndora">
        Powered by Myndora Solutions Ltd.
      </p>
    </article>
  );
}

function StatusBanner({
  booking,
  hours,
  remaining,
  instructions,
}: {
  booking: HouseholdBooking;
  hours: number;
  remaining: string;
  instructions: string;
}) {
  if (booking.status === "PENDING_VERIFICATION") {
    return (
      <div className="mt-5 rounded-2xl border-4 border-champions bg-amber-100 p-4 text-lg font-bold leading-relaxed">
        <p>
          ⏳ {hours}-Hour Confirmation Window Active: Your reserved tickets are
          held until {formatDeadline(booking.expiresAt)}. You MUST tap the green
          WhatsApp button below to verify your WhatsApp line and complete
          accreditation before this timer expires.
        </p>
        <p className="mt-2 text-champions">Time left: {remaining}</p>
      </div>
    );
  }

  if (booking.status === "ACCREDITED") {
    return (
      <div className="mt-5 rounded-2xl border-4 border-emerald bg-emerald/10 p-4 text-lg font-bold leading-relaxed">
        <p>🟢 ACCREDITED — READY FOR TICKET PAYMENT</p>
        <p className="mt-2">
          Pickup batch: {booking.pickupBatch || "The desk will assign your batch."}
        </p>
        <p className="mt-2 font-semibold">{instructions}</p>
      </div>
    );
  }

  if (booking.status === "PAID_ISSUED") {
    return (
      <div className="mt-5 rounded-2xl border-4 border-champions bg-champions/10 p-4 text-lg font-bold leading-relaxed">
        <p>🔵 PAID & PHYSICAL TICKETS ISSUED</p>
        <p className="mt-2 font-semibold">
          Your physical labeled tickets have been paid for and issued. Present
          them at the Point of Sale to purchase the items. The amount on this
          slip is the ticket fee only.
        </p>
      </div>
    );
  }

  if (booking.status === "EXPIRED") {
    return (
      <div className="mt-5 rounded-2xl border-4 border-red-800 bg-red-50 p-4 text-lg font-bold leading-relaxed text-red-900">
        <p>🔴 EXPIRED</p>
        <p className="mt-2 font-semibold">
          The {hours}-hour confirmation window lapsed before this household
          finished WhatsApp accreditation. The ticket hold is no longer active.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border-4 border-red-800 bg-red-50 p-4 text-lg font-bold leading-relaxed text-red-900">
      <p>🔴 REJECTED</p>
      <p className="mt-2 font-semibold">
        {booking.rejectionReason ||
          "The accreditation committee did not accept this registration."}
      </p>
    </div>
  );
}
