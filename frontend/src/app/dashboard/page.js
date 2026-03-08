"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isLoggedIn, logout, getCompanyName, listAgents } from "@/lib/api";

export default function Dashboard() {
  const router = useRouter();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    setCompany(getCompanyName() || "Company");
    listAgents()
      .then(setAgents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = () => { logout(); router.push("/"); };

  const copyUrl = (slug) => {
    navigator.clipboard.writeText(`${window.location.origin}/a/${slug}`);
  };

  const totalChats = agents.length * 42; // placeholder metric
  const knowledgeItems = agents.reduce((sum, a) => sum + (a.has_knowledge ? 12 : 0), 0);

  return (
    <div className="dashboard-layout">
      {/* ── Sidebar ────────────────────────────────── */}
      <aside className="dashboard-sidebar">
        <Link href="/" className="sidebar-logo">
          <span className="logo-icon">A²</span>
          Agent Squared
        </Link>
        <ul className="sidebar-nav">
          <li><a href="#" className="active">📊 Dashboard</a></li>
          <li><a href="#">🤖 Agents</a></li>
          <li><a href="#">📚 Knowledge</a></li>
          <li><a href="#">⚙️ Settings</a></li>
        </ul>
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {company.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{company}</div>
            <div className="sidebar-user-role">Pro Plan</div>
          </div>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────── */}
      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/build?type=support_qa" className="btn btn-primary">
              + New Agent
            </Link>
            <button onClick={handleLogout} className="btn btn-ghost" style={{ fontSize: "0.85rem" }}>
              Log out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Chats</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div className="stat-value">{totalChats.toLocaleString()}</div>
              <span className="stat-change">+12%</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Agents</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div className="stat-value">{agents.length}</div>
              <span className="stat-change">+{agents.length}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Knowledge Items</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div className="stat-value">{knowledgeItems || 0}</div>
              <span className="stat-change">+2%</span>
            </div>
          </div>
        </div>

        {/* Agent List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div className="loading-spinner" />
          </div>
        ) : agents.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: "3rem", marginBottom: 8 }}>🤖</div>
            <h3>No agents yet</h3>
            <p>Create your first AI support agent to get started.</p>
            <Link href="/build?type=support_qa" className="btn btn-primary">
              Create Support Agent →
            </Link>
          </div>
        ) : (
          <div className="agents-table">
            <div className="agents-table-header">
              <h3>My Agents</h3>
              <a href="#" style={{ fontSize: "0.85rem", color: "var(--primary)" }}>View all</a>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Agent Name</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id || agent.slug}>
                    <td>
                      <div className="agent-name-cell">
                        <div className="agent-avatar">
                          {agent.name?.charAt(0) || "A"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{agent.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            /a/{agent.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${agent.status}`}>
                        <span className="status-dot" />
                        {agent.status === "ready" ? "Live" : agent.status}
                      </span>
                    </td>
                    <td>
                      <span className="agent-type-badge">
                        {agent.agent_type === "support_qa" ? "💬 Support" : "📣 Marketing"}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link href={`/a/${agent.slug}`} className="action-btn" title="Open">
                          ↗
                        </Link>
                        <button className="action-btn" onClick={() => copyUrl(agent.slug)} title="Copy URL">
                          📋
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
