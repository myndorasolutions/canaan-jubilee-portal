import type { Metadata } from "next";
import LegalDocument from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Terms of Service | Canaan Jubilee Auction Portal",
};

export default function TermsPage() {
  return (
    <LegalDocument>
      <h1>Terms of Service</h1>
      <p>
        <strong>Effective Date:</strong> November 2026
      </p>
      <h2>1. Acceptance of Terms</h2>
      <p>
        By registering on the Canaan Jubilee Auction Portal, you agree to abide by
        these Terms of Service. This Portal is a private, subsidized initiative
        managed by Canaan Ministries and is not a commercial retail platform.
      </p>
      <h2>2. Eligibility and Registration</h2>
      <p>
        Registration is open to eligible church members and invited guests. You
        must register as a household. Creating multiple registrations for the same
        household using different phone numbers or variations of names is strictly
        prohibited and will result in the immediate cancellation of all associated
        bookings without refund of ticket fees.
      </p>
      <h2>3. Ticketing and Pricing Policy</h2>
      <ul>
        <li>
          Ticket Fees: The monetary value displayed on this Portal represents the
          Access Pass Fee required to reserve a ticket for a specific item
          category. It is not the final purchase price of the physical item.
        </li>
        <li>
          Subsidized Prices: The actual purchase price of the items is heavily
          subsidized, remains strictly confidential, and will only be disclosed to
          accredited buyers verbally at the physical venue.
        </li>
        <li>
          Quotas: Families are restricted to a maximum number of tickets as
          determined by the event administrators.
        </li>
      </ul>
      <h2>4. The 72-Hour Rule</h2>
      <p>
        Upon booking, you have 72 hours to receive accreditation. If your booking
        is not approved by the Accreditation Desk, or if you fail to attend your
        assigned batch, your reserved tickets will expire and be returned to the
        public pool.
      </p>
      <h2>5. Non-Transferability</h2>
      <p>
        Digital passes, QR codes, and physical tickets are strictly
        non-transferable and cannot be exchanged for cash or sold to third parties.
      </p>
    </LegalDocument>
  );
}
