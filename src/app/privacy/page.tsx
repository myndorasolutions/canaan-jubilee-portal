import type { Metadata } from "next";
import LegalDocument from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy | Canaan Jubilee Auction Portal",
};

export default function PrivacyPage() {
  return (
    <LegalDocument>
      <h1>Privacy Policy</h1>
      <p>
        <strong>Effective Date:</strong> November 2026
      </p>
      <h2>1. Introduction</h2>
      <p>
        Canaan Ministries / Champions&apos; Church (&quot;we,&quot; &quot;us,&quot; or
        &quot;our&quot;) is committed to protecting your privacy in accordance with
        the Nigerian Data Protection Act (NDPA). This Privacy Policy explains how
        we collect, use, and protect your personal information when you register
        for the Canaan Jubilee Auction Portal (the &quot;Portal&quot;).
      </p>
      <h2>2. Data We Collect</h2>
      <p>
        To ensure fair distribution and prevent hoarding, we collect the minimum
        information necessary:
      </p>
      <ul>
        <li>Identity Data: Full Name, WhatsApp Number.</li>
        <li>Affiliation Data: Church Unit, Leader, or Member Referee.</li>
        <li>Location Data: Home Street Address.</li>
        <li>
          Technical Data: Browser/Device fingerprint (deviceHash) used strictly
          for fraud prevention and duplicate registration detection.
        </li>
      </ul>
      <h2>3. How We Use Your Data</h2>
      <p>Your data is used exclusively to:</p>
      <ul>
        <li>Process and verify your household registration.</li>
        <li>Prevent duplicate bookings and enforce the family quota system.</li>
        <li>Send your QR pass and accreditation details via WhatsApp.</li>
        <li>Facilitate entry and ticket issuance at the physical event.</li>
      </ul>
      <h2>4. Data Sharing and Retention</h2>
      <p>
        We do not sell, rent, or share your personal data with third-party
        marketers. Data is only accessible to authorized church administrators and
        ticketing volunteers. All personally identifiable information will be
        securely deleted from our databases within 30 days after the conclusion of
        the Jubilee event, retaining only anonymized numerical data for internal
        reporting.
      </p>
      <h2>5. Your Rights</h2>
      <p>
        Under the NDPA, you have the right to request access to, correction of, or
        deletion of your personal data. To exercise these rights, please contact
        the Church Accreditation Desk.
      </p>
    </LegalDocument>
  );
}
