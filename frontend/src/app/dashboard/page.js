"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listAgents, isLoggedIn, getCompanyName, logout } from "@/lib/api";

const TYPE_LABELS = {
  support_qa: "💬 Support",
  social_marketing: "📣 Marketing",
};

const STATUS_COLORS = {
  ready: "var(--success)",
  building: "var(--warning)",
  crawling: "var(--warning)",
  error: "var(--error)",
};

export default function DashboardPage() {
  const router = useRouter();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    setCompanyName(getCompanyName());
    listAgents()
      .then(setAgents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="page">
      {/* Header bar */}
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
        <Link href="/" style={{ textDecoration: "none", color: "var(--text-primary)", fontWeight: 700, fontSize: "1.1rem" }}>
          Agent²
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            {companyName}
          </span>
          <button className="btn btn-ghost" onClick={handleLogout} style={{ padding: "6px 12px", fontSize: "0.85rem" }}>
            Log out
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="container" style={{ padding: "40px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <h1 style={{ fontSize: "1.75rem" }}>Your Agents</h1>
          <Link href="/build?type=support_qa" className="btn btn-primary">
            + Create Agent
          </Link>
        </div>

        {loading && <div className="loading-spinner" />}

        {!loading && agents.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <p style={{ fontSize: "2rem", marginBottom: 12 }}>🤖</p>
            <h3 style={{ marginBottom: 8 }}>No agents yet</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
              Create your first AI agent to get started
            </p>
            <Link href="/build?type=support_qa" className="btn btn-primary">
              Create Support Agent
            </Link>
          </div>
        )}

        {!loading && agents.length > 0 && (
          <div style={{ display: "grid", gap: 16 }}>
            {agents.map((agent) => (
              <div className="card" key={agent.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                    <h3 style={{ fontSize: "1.1rem" }}>{agent.name}</h3>
                    <span
                      style={{
                        padding: "2px 8px",
                        background: "rgba(124, 58, 237, 0.15)",
                        borderRadius: 100,
                        fontSize: "0.75rem",
                        color: "var(--accent-primary)",
                      }}
                    >
                      {TYPE_LABELS[agent.agent_type] || agent.agent_type}
                    </span>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: STATUS_COLORS[agent.status] || "var(--text-muted)",
                      }}
                    />
                  </div>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    {agent.url}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link href={agent.url} className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                    Open
                  </Link>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}${agent.url}`);
                    }}
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
