/**
 * API client for the Agent Squared backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

/**
 * Helper — get auth headers if token exists.
 */
function authHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// ── Auth ────────────────────────────────────────────────────

export async function signup({ email, password, companyName }) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, company_name: companyName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Signup failed");
  }
  const data = await res.json();
  localStorage.setItem("token", data.token);
  localStorage.setItem("company_name", data.company_name);
  return data;
}

export async function login({ email, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Login failed");
  }
  const data = await res.json();
  localStorage.setItem("token", data.token);
  localStorage.setItem("company_name", data.company_name);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("company_name");
}

export function isLoggedIn() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("token");
}

export function getCompanyName() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("company_name") || "";
}

// ── Templates ───────────────────────────────────────────────

export async function getTemplates() {
  const res = await fetch(`${API_BASE}/templates`);
  if (!res.ok) throw new Error("Failed to fetch templates");
  return res.json();
}

// ── Agents ──────────────────────────────────────────────────

export async function createAgent({ agentType, name, description, websiteUrl, forumUrl, forumType, forumEmail, forumPassword, configInput }) {
  const res = await fetch(`${API_BASE}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      agent_type: agentType,
      name,
      description,
      website_url: websiteUrl || null,
      forum_url: forumUrl || null,
      forum_type: forumType || null,
      forum_email: forumEmail || null,
      forum_password: forumPassword || null,
      config_input: configInput,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create agent");
  }
  return res.json();
}

export async function listAgents() {
  const res = await fetch(`${API_BASE}/agents`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch agents");
  return res.json();
}

export async function uploadFiles(agentId, files) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const res = await fetch(`${API_BASE}/upload/${agentId}`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload files");
  return res.json();
}

export async function getAgent(slug) {
  const res = await fetch(`${API_BASE}/agents/${slug}`);
  if (!res.ok) throw new Error("Agent not found");
  return res.json();
}

export async function listKnowledgeFiles(agentId) {
  const res = await fetch(`${API_BASE}/agents/${agentId}/knowledge`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch knowledge files");
  return res.json();
}

export async function deleteKnowledgeFile(agentId, fileId) {
  const res = await fetch(`${API_BASE}/agents/${agentId}/knowledge/${fileId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete file");
  return res.json();
}

export async function deleteAgent(agentId) {
  const res = await fetch(`${API_BASE}/agents/${agentId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete agent");
  return res.json();
}

// ── Chat ────────────────────────────────────────────────────

export async function sendMessage(slug, message, sessionId) {
  const res = await fetch(`${API_BASE}/agents/${slug}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to send message (${res.status})`);
  }
  return res.json();
}

export async function getChatHistory(slug, sessionId) {
  const res = await fetch(`${API_BASE}/agents/${slug}/history/${sessionId}`);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}
