"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSocialMentions, scanSocialMentions, updateMentionStatus } from "@/lib/api";

const SENTIMENT_CONFIG = {
  complaint: { label: "🔴 Complaint", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  question:  { label: "🟡 Question",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  praise:    { label: "🟢 Praise",    color: "#22c55e", bg: "rgba(34,197,94,0.1)"  },
  spam:      { label: "⬛ Spam",      color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

const STATUS_STYLE = {
  pending:  { color: "var(--text-secondary)" },
  approved: { color: "#22c55e" },
  ignored:  { color: "#6b7280" },
};

export default function SocialDashboard() {
  const { slug } = useParams();
  const [mentions, setMentions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    loadMentions();
  }, [slug]);

  async function loadMentions() {
    setLoading(true);
    try {
      const data = await getSocialMentions(slug);
      setMentions(data);
    } catch (e) {
      setError("Failed to load mentions");
    } finally {
      setLoading(false);
    }
  }

  async function handleScan() {
    setScanning(true);
    setError("");
    try {
      await scanSocialMentions(slug);
      await loadMentions();
    } catch (e) {
      setError("Scan failed: " + e.message);
    } finally {
      setScanning(false);
    }
  }

  async function handleStatus(mentionId, status) {
    try {
      const updated = await updateMentionStatus(slug, mentionId, status);
      setMentions((prev) => prev.map((m) => (m.id === mentionId ? updated : m)));
    } catch (e) {
      setError("Failed to update mention");
    }
  }

  const pending = mentions.filter((m) => m.status === "pending").length;
  const approved = mentions.filter((m) => m.status === "approved").length;

  const breakdown = ["complaint", "question", "praise", "spam"].map((s) => ({
    key: s,
    count: mentions.filter((m) => m.sentiment === s).length,
    ...SENTIMENT_CONFIG[s],
  }));

  return (
    <div className="page">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/dashboard" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "0.85rem" }}>
            ← Dashboard
          </Link>
          <span style={{ color: "var(--border-color)" }}>|</span>
          <span style={{ fontWeight: 700 }}>🦋 Bluesky Monitor</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/a/${slug}`} className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: "0.85rem" }}>
            💬 Chat
          </Link>
          <button
            className="btn btn-primary"
            onClick={handleScan}
            disabled={scanning}
            style={{ padding: "6px 16px", fontSize: "0.85rem" }}
          >
            {scanning ? "Scanning…" : "🔍 Scan for mentions"}
          </button>
        </div>
      </div>

      <div className="container" style={{ padding: "32px 24px" }}>
        {/* Stats bar */}
        <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
          <div className="card" style={{ flex: 1, minWidth: 120, textAlign: "center", padding: "16px 24px" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{pending}</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Pending</div>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 120, textAlign: "center", padding: "16px 24px" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#22c55e" }}>{approved}</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Approved</div>
          </div>
          {breakdown.map((b) => (
            <div
              key={b.key}
              className="card"
              style={{ flex: 1, minWidth: 120, textAlign: "center", padding: "16px 24px", background: b.bg, borderColor: b.color + "40" }}
            >
              <div style={{ fontSize: "2rem", fontWeight: 700, color: b.color }}>{b.count}</div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{b.label}</div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ color: "var(--error)", marginBottom: 16, padding: "10px 16px", background: "rgba(239,68,68,0.1)", borderRadius: 8, fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        {loading && <div className="loading-spinner" />}

        {!loading && mentions.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <p style={{ fontSize: "2.5rem", marginBottom: 12 }}>📡</p>
            <h3 style={{ marginBottom: 8 }}>No mentions yet</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
              Click "Scan for mentions" to find and classify brand mentions
            </p>
            <button className="btn btn-primary" onClick={handleScan} disabled={scanning}>
              {scanning ? "Scanning…" : "Scan Now"}
            </button>
          </div>
        )}

        {/* Mention cards */}
        <div style={{ display: "grid", gap: 16 }}>
          {mentions.map((m) => {
            const sentiment = SENTIMENT_CONFIG[m.sentiment] || SENTIMENT_CONFIG.question;
            return (
              <div
                key={m.id}
                className="card"
                style={{
                  borderLeft: `3px solid ${sentiment.color}`,
                  opacity: m.status === "ignored" ? 0.5 : 1,
                }}
              >
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "var(--bg-tertiary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        color: "var(--accent-primary)",
                      }}
                    >
                      {m.author[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{m.author}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{m.author_handle}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: 100,
                        fontSize: "0.75rem",
                        background: sentiment.bg,
                        color: sentiment.color,
                        fontWeight: 600,
                      }}
                    >
                      {sentiment.label}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: STATUS_STYLE[m.status]?.color, textTransform: "capitalize" }}>
                      {m.status}
                    </span>
                  </div>
                </div>

                {/* Tweet text */}
                <p style={{ marginBottom: 16, lineHeight: 1.5, color: "var(--text-primary)" }}>{m.text}</p>

                {/* Suggested reply */}
                {m.suggested_reply && m.sentiment !== "spam" && (
                  <div
                    style={{
                      background: "var(--bg-tertiary)",
                      borderRadius: 8,
                      padding: "12px 14px",
                      marginBottom: 16,
                      fontSize: "0.875rem",
                      color: "var(--text-secondary)",
                      borderLeft: "2px solid var(--accent-primary)",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", color: "var(--accent-primary)", marginBottom: 4, fontWeight: 600 }}>
                      💬 SUGGESTED REPLY
                    </div>
                    {m.suggested_reply}
                  </div>
                )}

                {/* Actions */}
                {m.status === "pending" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-primary"
                      style={{ padding: "6px 16px", fontSize: "0.8rem" }}
                      onClick={() => handleStatus(m.id, "approved")}
                    >
                      ✓ Approve
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: "6px 16px", fontSize: "0.8rem" }}
                      onClick={() => handleStatus(m.id, "ignored")}
                    >
                      ✗ Ignore
                    </button>
                  </div>
                )}
                {m.status !== "pending" && (
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "4px 12px", fontSize: "0.75rem" }}
                    onClick={() => handleStatus(m.id, "pending")}
                  >
                    ↩ Undo
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
