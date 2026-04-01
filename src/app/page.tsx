import type { Metadata } from "next";
import HomeClient from "./HomeClient";

type Props = {
  searchParams: Promise<{ score?: string; summary?: string; hidden?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const score = params.score;
  const hidden = params.hidden === "1";
  const summary = params.summary;

  // Build dynamic OG image URL
  const ogParams = new URLSearchParams();
  if (score) ogParams.set("score", score);
  if (hidden) ogParams.set("hidden", "1");
  if (summary && !hidden) ogParams.set("summary", summary);
  const ogUrl = `https://ratemyidea.ai/api/og${ogParams.toString() ? `?${ogParams.toString()}` : ""}`;

  // Dynamic titles based on whether this is a shared result
  if (score) {
    const title = hidden
      ? `An entrepreneur scored ${score}/10 — Rate My Idea`
      : `Scored ${score}/10 — Rate My Idea`;
    const description = hidden
      ? `Someone rated their business idea and got ${score}/10. Rate yours free!`
      : summary || `This idea scored ${score}/10. Rate yours free!`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        url: `https://ratemyidea.ai?score=${score}${hidden ? "&hidden=1" : ""}`,
        images: [{ url: ogUrl, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogUrl],
      },
    };
  }

  // Default metadata (homepage)
  return {
    title: "Rate My Idea — AI-Powered Business Idea Validator",
    description:
      "Get an instant AI score for your business idea. Free analysis of market potential, competition, and viability in seconds.",
    openGraph: {
      title: "Rate My Idea — Is Your Business Idea Any Good?",
      description:
        "Get an instant AI score for your business idea. Free market analysis in seconds.",
      type: "website",
      url: "https://ratemyidea.ai",
      images: [{ url: ogUrl, width: 1200, height: 630, alt: "Rate My Idea" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Rate My Idea — AI Business Idea Validator",
      description:
        "Get an instant AI score for your business idea. Free analysis in seconds.",
      images: [ogUrl],
    },
  };
}

export default function Page() {
  return <HomeClient />;
}
