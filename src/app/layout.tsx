import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Rate My Idea — AI-Powered Business Idea Validator",
    template: "%s",
  },
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
