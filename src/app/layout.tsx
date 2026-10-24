import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Canaan Jubilee Auction Portal",
  description:
    "Annual household ticket booking for Canaan Ministries (a.k.a. Champions' Church).",
  applicationName: "Canaan Jubilee",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0D254C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-lg text-foreground">
        {children}
      </body>
    </html>
  );
}
