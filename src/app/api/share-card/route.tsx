import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const score = searchParams.get("score");
  const name = searchParams.get("name");
  const keywords = searchParams.get("keywords");
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
          padding: "60px 40px",
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

        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 48,
          }}
        >
          <span style={{ fontSize: 56 }}>🧠</span>
          <span
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "#F8FAFC",
              letterSpacing: "-0.02em",
            }}
          >
            Rate My Idea
          </span>
        </div>

        {scoreNum !== null ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center" }}>
            {/* Idea name or hidden */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 48,
                padding: "14px 40px",
                background: "rgba(108,58,255,0.15)",
                borderRadius: 100,
                border: "1px solid rgba(108,58,255,0.3)",
              }}
            >
              {hidden ? (
                <span style={{ fontSize: 36, color: "#94A3B8" }}>
                  🔒 Idea Hidden
                </span>
              ) : (
                <span style={{ fontSize: 36, color: "#F8FAFC", fontWeight: 600 }}>
                  {name || "Business Idea"}
                </span>
              )}
            </div>

            {/* Score circle — BIG */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 360,
                height: 360,
                borderRadius: "50%",
                border: `10px solid ${scoreColor}`,
                background: "rgba(22,22,42,0.9)",
                marginBottom: 48,
                boxShadow: `0 0 80px ${scoreColor}44`,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 140,
                    fontWeight: 800,
                    color: scoreColor,
                    lineHeight: 1,
                  }}
                >
                  {scoreNum.toFixed(1)}
                </span>
                <span style={{ fontSize: 32, color: "#64748B", marginTop: 4 }}>/ 10</span>
              </div>
            </div>

            {/* Keywords */}
            {keywordList.length > 0 && (
              <div style={{ display: "flex", gap: 16 }}>
                {keywordList.map((kw, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      padding: "10px 24px",
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: 100,
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <span style={{ fontSize: 26, color: "#94A3B8" }}>{kw.trim()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 36, color: "#94A3B8", display: "flex" }}>
              AI-powered business idea validation
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#64748B",
            fontSize: 24,
            marginTop: 32,
          }}
        >
          <span>ratemyidea.ai</span>
          <span style={{ color: "#6C3AFF" }}>•</span>
          <span>by AI Norte</span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    }
  );
}
