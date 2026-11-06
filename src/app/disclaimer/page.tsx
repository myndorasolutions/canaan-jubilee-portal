import type { Metadata } from "next";
import LegalDocument from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Event Disclaimer | Canaan Jubilee Auction Portal",
};

export default function DisclaimerPage() {
  return (
    <LegalDocument>
      <h1>Event Disclaimer</h1>
      <p>
        <strong>Effective Date:</strong> November 2026
      </p>
      <h2>1. Stock Availability</h2>
      <p>
        While we strive to accommodate all accredited registrants, all items are
        distributed on a &quot;while stocks last&quot; basis. Booking a ticket on the
        Portal reserves your right to purchase an item, but physical stock is
        subject to venue logistics and final availability on the day of the event.
      </p>
      <h2>2. Right of Refusal</h2>
      <p>
        Canaan Ministries reserves the right to deny entry, revoke accreditation,
        or refuse service at the venue if a participant is found to have violated
        the household quota rules, engaged in disruptive behavior, or attempted to
        bypass the anti-hoarding systems.
      </p>
      <h2>3. Limitation of Liability</h2>
      <p>
        Participation in the Jubilee event is entirely voluntary. Canaan
        Ministries, its staff, and its technical partners (Myndora Solutions Ltd.)
        shall not be held liable for any direct or indirect losses, technical
        network failures preventing registration, or the unavailability of specific
        subsidized items.
      </p>
    </LegalDocument>
  );
}
