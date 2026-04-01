import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const score = searchParams.get("score");
  const name = searchParams.get("name");
  const keywords = searchParams.get("keywords"); // comma-separated
  const hidden = searchParams.get("hidden") === "1";

  const scoreNum = score ? parseFloat(score) : null;
  const scoreColor =
    scoreNum !== null
      ? scoreNum >= 7.5
        ? "#22C55E"
        : scoreNum >= 5
          ? "#FACC15"
          : "#EF4444"
      : "#6C3AFF";

  const keywordList = keywords ? keywords.split(",").slice(0, 3) : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 50%, #0F0F1A 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(rgba(108,58,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(108,58,255,0.06) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Top brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 36 }}>🧠</span>
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#F8FAFC",
              letterSpacing: "-0.02em",
            }}
          >
            Rate My Idea
          </span>
        </div>

        {scoreNum !== null ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Idea name or hidden label */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 20,
                padding: "8px 24px",
                background: "rgba(108,58,255,0.15)",
                borderRadius: 100,
                border: "1px solid rgba(108,58,255,0.3)",
              }}
            >
              {hidden ? (
                <span style={{ fontSize: 22, color: "#94A3B8" }}>
                  🔒 Idea Hidden
                </span>
              ) : (
                <span style={{ fontSize: 22, color: "#F8FAFC", fontWeight: 600 }}>
                  {name || "Business Idea"}
                </span>
              )}
            </div>

            {/* Score circle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 160,
                height: 160,
                borderRadius: "50%",
                border: `7px solid ${scoreColor}`,
                background: "rgba(22,22,42,0.9)",
                marginBottom: 20,
                boxShadow: `0 0 40px ${scoreColor}33`,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 64,
                    fontWeight: 800,
                    color: scoreColor,
                    lineHeight: 1,
                  }}
                >
                  {scoreNum.toFixed(1)}
                </span>
                <span style={{ fontSize: 16, color: "#64748B", marginTop: 2 }}>/ 10</span>
              </div>
            </div>

            {/* Keywords */}
            {keywordList.length > 0 && (
              <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                {keywordList.map((kw, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      padding: "6px 16px",
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: 100,
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <span style={{ fontSize: 16, color: "#94A3B8" }}>{kw.trim()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                fontSize: 28,
                color: "#94A3B8",
                marginTop: 8,
                display: "flex",
              }}
            >
              AI-powered business idea validation
            </div>
            <div
              style={{
                fontSize: 20,
                color: "#64748B",
                marginTop: 8,
                display: "flex",
              }}
            >
              Free • Instant • No signup required
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#64748B",
            fontSize: 18,
          }}
        >
          <span>ratemyidea.ai</span>
          <span style={{ color: "#6C3AFF" }}>•</span>
          <span>by AI Norte</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
