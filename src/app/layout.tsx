import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Rate My Idea — AI-Powered Business Idea Validator",
  description:
    "Get an instant AI score for your business idea. Free analysis of market potential, competition, and viability in seconds.",
  keywords: [
    "business idea validator",
    "rate my idea",
    "startup idea score",
    "AI business analysis",
    "market validation",
    "idea rater",
  ],
  metadataBase: new URL("https://ratemyidea.ai"),
  openGraph: {
    title: "Rate My Idea — Is Your Business Idea Any Good?",
    description:
      "Get an instant AI score for your business idea. Free market analysis in seconds.",
    type: "website",
    url: "https://ratemyidea.ai",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rate My Idea — AI Business Idea Validator",
    description:
      "Get an instant AI score for your business idea. Free analysis in seconds.",
    images: ["/api/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
