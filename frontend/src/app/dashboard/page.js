"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isLoggedIn, logout, getCompanyName, listAgents, listKnowledgeFiles, deleteKnowledgeFile, uploadFiles, deleteAgent } from "@/lib/api";

export default function Dashboard() {
  const router = useRouter();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [copiedSlug, setCopiedSlug] = useState(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    setCompany(getCompanyName() || "Company");
    listAgents()
      .then(setAgents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = () => { logout(); router.push("/"); };

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedSlug(key);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleDeleteAgent = async (agentId) => {
    if (!confirm("Delete this agent and all its knowledge files? This cannot be undone.")) return;
    try {
      await deleteAgent(agentId);
      setAgents(prev => prev.filter(a => a.id !== agentId));
    } catch (e) {
      alert("Failed to delete agent");
    }
  };

  const totalChats = agents.length * 42;
  const knowledgeItems = agents.reduce((sum, a) => sum + (a.has_knowledge ? 12 : 0), 0);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "agents", label: "Agents", icon: "🤖" },
    { id: "knowledge", label: "Knowledge", icon: "📚" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <div className="dashboard-layout">
      {/* ── Sidebar ────────────────────────────────── */}
      <aside className="dashboard-sidebar">
        <Link href="/" className="sidebar-logo">
          <img src="/logo.png" className="logo-icon" alt="Agent Squared Logo" />
          Agent Squared
        </Link>
        <ul className="sidebar-nav">
          {tabs.map(tab => (
            <li key={tab.id}>
              <button
                className={activeTab === tab.id ? "active" : ""}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon} {tab.label}
              </button>
            </li>
          ))}
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
<<<<<<< HEAD
        {activeTab === "dashboard" && (
          <DashboardTab
            agents={agents} loading={loading} totalChats={totalChats}
            knowledgeItems={knowledgeItems} handleLogout={handleLogout}
          />
        )}
        {activeTab === "agents" && (
          <AgentsTab
            agents={agents} loading={loading}
            copiedSlug={copiedSlug} copyText={copyText}
            handleDeleteAgent={handleDeleteAgent} handleLogout={handleLogout}
          />
        )}
        {activeTab === "knowledge" && (
          <KnowledgeTab agents={agents} />
        )}
        {activeTab === "settings" && (
          <SettingsTab company={company} handleLogout={handleLogout} />
=======
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/build?type=support_qa" className="btn btn-primary">
              + Support Agent
            </Link>
            <Link href="/build?type=social_monitor" className="btn btn-primary" style={{ background: 'var(--brand-bluesky, #0a7ea4)' }}>
              + Social Monitor
            </Link>
            <Link href="/build?type=social_marketing" className="btn btn-primary" style={{ background: '#d946ef' }}>
              + Social Marketing
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
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <Link href="/build?type=support_qa" className="btn btn-primary">
                Create Support Agent →
              </Link>
              <Link href="/build?type=social_monitor" className="btn btn-primary" style={{ background: 'var(--brand-bluesky, #0a7ea4)' }}>
                Create Social Monitor →
              </Link>
              <Link href="/build?type=social_marketing" className="btn btn-primary" style={{ background: '#d946ef' }}>
                Create Social Marketing →
              </Link>
            </div>
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
                        {agent.agent_type === "support_qa" ? "💬 Support" : agent.agent_type === "social_monitor" ? "🦋 Social Monitor" : "📣 Marketing"}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link 
                          href={agent.agent_type === "social_monitor" ? `/social/${agent.slug}` : `/a/${agent.slug}`} 
                          className="action-btn" 
                          title="Open"
                        >
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
>>>>>>> teammate-base
        )}
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD TAB — Overview, Stats, Activity Feed
   ═══════════════════════════════════════════════════════════ */

function DashboardTab({ agents, loading, totalChats, knowledgeItems, handleLogout }) {
  // Generate mock activity from real agents
  const activities = [];
  agents.forEach(agent => {
    activities.push({
      icon: "🚀",
      text: `${agent.name} was created`,
      time: agent.created_at ? new Date(agent.created_at).toLocaleDateString() : "Recently",
      color: "var(--primary)",
    });
    if (agent.has_knowledge) {
      activities.push({
        icon: "📄",
        text: `Knowledge base loaded for ${agent.name}`,
        time: "Active",
        color: "var(--success)",
      });
    }
    if (agent.status === "ready") {
      activities.push({
        icon: "✅",
        text: `${agent.name} is live and answering questions`,
        time: "Now",
        color: "var(--success)",
      });
    }
  });

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
            Overview of your AI agents and activity
          </p>
        </div>
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
            <span className="stat-change">Live</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Knowledge Items</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <div className="stat-value">{knowledgeItems || 0}</div>
            <span className="stat-change">Indexed</span>
          </div>
        </div>
      </div>

      {/* Two column layout: Recent agents + Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Recent Agents (top 3) */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "0.95rem" }}>Recent Agents</h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{agents.length} total</span>
          </div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 32 }}>
              <div className="loading-spinner" />
            </div>
          ) : agents.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>🤖</div>
              <p style={{ fontSize: "0.85rem" }}>No agents yet</p>
              <Link href="/build?type=support_qa" className="btn btn-primary" style={{ marginTop: 12, fontSize: "0.85rem", padding: "8px 16px" }}>
                Create Agent
              </Link>
            </div>
          ) : (
            <div>
              {agents.slice(0, 3).map(agent => (
                <Link
                  key={agent.id || agent.slug}
                  href={`/a/${agent.slug}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 20px", borderBottom: "1px solid var(--border-light)",
                    textDecoration: "none", color: "inherit", transition: "background 0.15s",
                  }}
                  onMouseOver={e => e.currentTarget.style.background = "var(--bg-surface)"}
                  onMouseOut={e => e.currentTarget.style.background = ""}
                >
                  <div className="agent-avatar" style={{ width: 36, height: 36, fontSize: "0.85rem" }}>
                    {agent.name?.charAt(0) || "A"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{agent.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>/a/{agent.slug}</div>
                  </div>
                  <span className={`status-badge status-${agent.status}`} style={{ fontSize: "0.7rem" }}>
                    <span className="status-dot" />
                    {agent.status === "ready" ? "Live" : agent.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "0.95rem" }}>Recent Activity</h3>
          </div>
          {activities.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>📋</div>
              <p style={{ fontSize: "0.85rem" }}>No activity yet</p>
            </div>
          ) : (
            <div>
              {activities.slice(0, 6).map((activity, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 20px", borderBottom: "1px solid var(--border-light)",
                  }}
                >
                  <span style={{ fontSize: "1.1rem" }}>{activity.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.85rem" }}>{activity.text}</div>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: activity.color, fontWeight: 600 }}>
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   AGENTS TAB — Full Management with Expand-to-Manage
   ═══════════════════════════════════════════════════════════ */

function AgentsTab({ agents, loading, copiedSlug, copyText, handleDeleteAgent, handleLogout }) {
  const [expandedAgent, setExpandedAgent] = useState(null);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>My Agents</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
            Manage your agents, embed codes, and configurations
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/build?type=support_qa" className="btn btn-primary">
            + New Agent
          </Link>
          <button onClick={handleLogout} className="btn btn-ghost" style={{ fontSize: "0.85rem" }}>
            Log out
          </button>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: "3rem", marginBottom: 8 }}>🤖</div>
          <h3>No agents yet</h3>
          <p>Create your first AI support agent to get started.</p>
          <Link href="/build?type=support_qa" className="btn btn-primary">
            Create Support Agent →
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {agents.map((agent) => {
            const isExpanded = expandedAgent === agent.id;
            const agentUrl = typeof window !== "undefined"
              ? `${window.location.origin}/a/${agent.slug}` : `/a/${agent.slug}`;
            const embedCode = typeof window !== "undefined"
              ? `<script src="${window.location.origin}/widget.js" data-agent="${agent.slug}"></script>`
              : "";

            return (
              <div key={agent.id || agent.slug} className="card" style={{ padding: 0, overflow: "hidden" }}>
                {/* Agent header — clickable to expand */}
                <div
                  onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "16px 20px", cursor: "pointer",
                    transition: "background 0.15s",
                    background: isExpanded ? "var(--primary-surface)" : "var(--bg)",
                  }}
                >
                  <div className="agent-avatar" style={{ width: 44, height: 44, fontSize: "1rem" }}>
                    {agent.name?.charAt(0) || "A"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{agent.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      /a/{agent.slug}
                    </div>
                  </div>
                  <span className={`status-badge status-${agent.status}`}>
                    <span className="status-dot" />
                    {agent.status === "ready" ? "Live" : agent.status}
                  </span>
                  <span className="agent-type-badge">
                    {agent.agent_type === "support_qa" ? "💬 Support" : "📣 Marketing"}
                  </span>
                  <span style={{
                    fontSize: "0.85rem", color: "var(--text-muted)",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}>▼</span>
                </div>

                {/* Expanded management panel */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                      {/* Direct Link */}
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                          Direct URL
                        </div>
                        <div className="url-box" style={{ marginBottom: 0 }}>
                          <input type="text" value={agentUrl} readOnly style={{ fontSize: "0.8rem" }} />
                          <button onClick={() => copyText(agentUrl, `url-${agent.slug}`)}>
                            {copiedSlug === `url-${agent.slug}` ? "✓" : "Copy"}
                          </button>
                        </div>
                      </div>

                      {/* Embed Code */}
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                          Embed Code
                        </div>
                        <div className="url-box" style={{ marginBottom: 0 }}>
                          <input
                            type="text" value={embedCode} readOnly
                            style={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                          />
                          <button onClick={() => copyText(embedCode, `embed-${agent.slug}`)}>
                            {copiedSlug === `embed-${agent.slug}` ? "✓" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Agent Details */}
                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 12, marginBottom: 16, padding: 16,
                      background: "var(--bg-surface)", borderRadius: "var(--radius-sm)",
                    }}>
                      <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 2 }}>Type</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                          {agent.agent_type === "support_qa" ? "Support Q&A" : "Marketing"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 2 }}>Knowledge</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                          {agent.has_knowledge ? "✅ Active" : "⏳ None"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 2 }}>Created</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                          {agent.created_at ? new Date(agent.created_at).toLocaleDateString() : "—"}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 10 }}>
                      <Link href={`/a/${agent.slug}`} className="btn btn-primary" style={{ fontSize: "0.85rem", padding: "8px 20px" }}>
                        Open Workspace →
                      </Link>
                      <button
                        onClick={() => handleDeleteAgent(agent.id)}
                        className="btn"
                        style={{
                          background: "var(--error-bg)", color: "var(--error)",
                          border: "1px solid var(--error)", fontSize: "0.85rem", padding: "8px 20px",
                        }}
                      >
                        🗑 Delete Agent
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   KNOWLEDGE TAB
   ═══════════════════════════════════════════════════════════ */

function KnowledgeTab({ agents }) {
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [files, setFiles] = useState({});
  const [loadingFiles, setLoadingFiles] = useState({});
  const [uploading, setUploading] = useState(false);

  const toggleAgent = async (agentId) => {
    if (expandedAgent === agentId) {
      setExpandedAgent(null);
      return;
    }
    setExpandedAgent(agentId);
    if (!files[agentId]) {
      setLoadingFiles(prev => ({ ...prev, [agentId]: true }));
      try {
        const f = await listKnowledgeFiles(agentId);
        setFiles(prev => ({ ...prev, [agentId]: f }));
      } catch (e) {
        setFiles(prev => ({ ...prev, [agentId]: [] }));
      }
      setLoadingFiles(prev => ({ ...prev, [agentId]: false }));
    }
  };

  const handleDelete = async (agentId, fileId) => {
    if (!confirm("Delete this knowledge file?")) return;
    try {
      await deleteKnowledgeFile(agentId, fileId);
      setFiles(prev => ({
        ...prev,
        [agentId]: prev[agentId].filter(f => f.id !== fileId),
      }));
    } catch (e) {
      alert("Failed to delete file");
    }
  };

  const handleUpload = async (agentId, fileList) => {
    if (!fileList.length) return;
    setUploading(true);
    try {
      await uploadFiles(agentId, Array.from(fileList));
      const f = await listKnowledgeFiles(agentId);
      setFiles(prev => ({ ...prev, [agentId]: f }));
    } catch (e) {
      alert("Upload failed: " + e.message);
    }
    setUploading(false);
  };

  return (
    <>
      <div className="dashboard-header">
        <h1>Knowledge Base</h1>
      </div>

      {agents.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: "3rem", marginBottom: 8 }}>📚</div>
          <h3>No knowledge yet</h3>
          <p>Create an agent and upload documents or crawl a website to build your knowledge base.</p>
          <Link href="/build?type=support_qa" className="btn btn-primary">
            Create Agent →
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {agents.map(agent => {
            const isExpanded = expandedAgent === agent.id;
            const agentFiles = files[agent.id] || [];
            const isLoading = loadingFiles[agent.id];

            return (
              <div key={agent.id || agent.slug} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div
                  onClick={() => toggleAgent(agent.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "16px 20px", cursor: "pointer",
                    transition: "background 0.15s",
                    background: isExpanded ? "var(--primary-surface)" : "var(--bg)",
                  }}
                >
                  <div className="agent-avatar" style={{ width: 40, height: 40, fontSize: "0.95rem" }}>
                    {agent.name?.charAt(0) || "A"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{agent.name}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {agent.website_url ? `Crawled: ${agent.website_url}` : "Manual uploads"}
                    </div>
                  </div>
                  <span style={{
                    fontSize: "0.85rem", color: "var(--text-muted)",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}>▼</span>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "16px 20px" }}>
                    {isLoading ? (
                      <div style={{ textAlign: "center", padding: 20 }}>
                        <div className="loading-spinner" style={{ width: 32, height: 32 }} />
                      </div>
                    ) : agentFiles.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: 12 }}>
                        No knowledge files yet. Upload documents below.
                      </p>
                    ) : (
                      <ul className="file-list" style={{ marginBottom: 16 }}>
                        {agentFiles.map(file => (
                          <li key={file.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                              <span style={{ fontSize: "1.1rem" }}>
                                {file.source_type === "web_crawl" ? "🌐" : "📄"}
                              </span>
                              <div>
                                <div style={{ fontWeight: 500, fontSize: "0.85rem" }}>{file.filename}</div>
                                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                  {file.source_type === "web_crawl" ? "Web crawl" : file.mime_type || "Document"}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDelete(agent.id, file.id)}
                              title="Delete"
                              style={{
                                background: "none", border: "none", color: "var(--error)",
                                cursor: "pointer", fontSize: "0.85rem", padding: "4px 8px",
                                borderRadius: "var(--radius-sm)", transition: "background 0.15s",
                              }}
                              onMouseOver={e => e.target.style.background = "var(--error-bg)"}
                              onMouseOut={e => e.target.style.background = "none"}
                            >
                              🗑
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div
                      className="upload-zone"
                      style={{ padding: 20 }}
                      onClick={() => {
                        const inp = document.createElement("input");
                        inp.type = "file";
                        inp.multiple = true;
                        inp.accept = ".pdf,.txt,.md,.csv,.doc,.docx";
                        inp.onchange = (e) => handleUpload(agent.id, e.target.files);
                        inp.click();
                      }}
                    >
                      {uploading ? (
                        <div className="loading-spinner" style={{ width: 24, height: 24, margin: "0 auto" }} />
                      ) : (
                        <>
                          <div className="upload-icon">📄</div>
                          <p>Click to upload files • PDF, TXT, MD, CSV</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   SETTINGS TAB
   ═══════════════════════════════════════════════════════════ */

function SettingsTab({ company, handleLogout }) {
  return (
    <>
      <div className="dashboard-header">
        <h1>Settings</h1>
      </div>

      <div style={{ display: "grid", gap: 20, maxWidth: 560 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Account</h3>
          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input className="form-input" type="text" value={company} readOnly />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Plan</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="agent-type-badge">🚀 Pro Plan</span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Unlimited agents & chats</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Widget Integration</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16 }}>
            Add the embed code to any website to display a chat widget for your AI agent.
            Go to the <strong>Agents</strong> tab to copy the embed code for each agent.
          </p>
          <div style={{
            padding: 16, background: "var(--bg-surface)", borderRadius: "var(--radius-sm)",
            fontFamily: "monospace", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.8
          }}>
            {'<script src="https://yourdomain.com/widget.js"'}<br />
            {'  data-agent="your-agent-slug">'}
            {'</script>'}
          </div>
        </div>

        <div className="card" style={{ borderColor: "var(--error)" }}>
          <h3 style={{ marginBottom: 8, color: "var(--error)" }}>Danger Zone</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16 }}>
            Logging out will clear your session. You can log back in anytime.
          </p>
          <button onClick={handleLogout} className="btn" style={{
            background: "var(--error-bg)", color: "var(--error)", border: "1px solid var(--error)"
          }}>
            Log Out
          </button>
        </div>
      </div>
    </>
  );
}
