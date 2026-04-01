import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const score = searchParams.get("score");
  const hidden = searchParams.get("hidden") === "1";
  const rawSummary = searchParams.get("summary") || "AI-powered business idea validation";
  const summary = hidden
    ? `An entrepreneur scored ${score || "?"}/10 — rate your idea free!`
    : rawSummary;

  const scoreNum = score ? parseFloat(score) : null;
  const scoreColor =
    scoreNum !== null
      ? scoreNum >= 7.5
        ? "#22C55E"
        : scoreNum >= 5
          ? "#FACC15"
          : "#EF4444"
      : "#6C3AFF";

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
        }}
      >
        {/* Grid background overlay */}
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
            gap: 12,
            marginBottom: scoreNum !== null ? 32 : 16,
          }}
        >
          <span style={{ fontSize: 48 }}>🧠</span>
          <span
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: "#F8FAFC",
              letterSpacing: "-0.02em",
            }}
          >
            Rate My Idea
          </span>
        </div>

        {scoreNum !== null ? (
          <>
            {/* Score circle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 180,
                height: 180,
                borderRadius: "50%",
                border: `8px solid ${scoreColor}`,
                background: "rgba(22,22,42,0.8)",
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  fontSize: 72,
                  fontWeight: 800,
                  color: scoreColor,
                }}
              >
                {scoreNum.toFixed(1)}
              </span>
            </div>

            {/* Summary */}
            <div
              style={{
                fontSize: 22,
                color: "#94A3B8",
                maxWidth: 800,
                textAlign: "center",
                lineHeight: 1.4,
                padding: "0 40px",
                display: "flex",
              }}
            >
              {summary.length > 150 ? summary.slice(0, 147) + "..." : summary}
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 28,
                color: "#94A3B8",
                marginTop: 8,
                display: "flex",
              }}
            >
              AI-powered business idea validation. Free. Instant.
            </div>
          </>
        )}

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
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
