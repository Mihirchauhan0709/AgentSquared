"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { createAgent, uploadFiles, isLoggedIn } from "@/lib/api";
import Link from "next/link";

const TEMPLATE_FIELDS = {
  support_qa: {
    label: "Customer Support Agent",
    fields: [
      { name: "tone", label: "Support Tone", type: "text", placeholder: "e.g. friendly and professional" },
      { name: "policies", label: "Key Policies", type: "textarea", placeholder: "e.g. 30-day returns, support hours 9-5 EST" },
      { name: "context", label: "Additional Business Context", type: "textarea", placeholder: "e.g. We sell widgets in 3 tiers. Most issues are about shipping.", required: false },
    ],
    supportsUpload: true,
    supportsWebsite: true,
    supportsForum: true,
  },
  social_marketing: {
    label: "Social Media Marketing Agent",
    fields: [
      { name: "bluesky_handle", label: "Bluesky Handle", type: "text", placeholder: "e.g. brand.bsky.social", required: true },
      { name: "audience", label: "Target Audience", type: "text", placeholder: "e.g. B2B SaaS decision-makers" },
      { name: "goals", label: "Marketing Goals", type: "textarea", placeholder: "e.g. Increase brand awareness, drive demo signups" },
      { name: "brand_tone", label: "Brand Tone", type: "text", placeholder: "e.g. bold, witty, thought-leader" },
    ],
    supportsUpload: false,
    supportsWebsite: false,
    supportsForum: false,
  },
  social_monitor: {
    label: "Bluesky Social Monitor 🦋",
    fields: [
      { name: "bluesky_handle", label: "Bluesky Handle", type: "text", placeholder: "e.g. brand.bsky.social", required: true },
      { name: "brand_tone", label: "Reply Tone", type: "text", placeholder: "e.g. friendly, professional, witty" },
      { name: "topics", label: "Topics to Monitor", type: "textarea", placeholder: "e.g. shipping delay, product praise, returns" },
    ],
    supportsUpload: true,
    supportsWebsite: false,
    supportsForum: false,
  },
};

function BuildFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const agentType = searchParams.get("type") || "support_qa";
  const template = TEMPLATE_FIELDS[agentType] || TEMPLATE_FIELDS.support_qa;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [forumUrl, setForumUrl] = useState("");
  const [forumType, setForumType] = useState("auto");
  const [forumEmail, setForumEmail] = useState("");
  const [forumPassword, setForumPassword] = useState("");
  const [configInput, setConfigInput] = useState({});
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Building your agent…");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) router.push("/login");
  }, [router]);

  const handleFieldChange = (fieldName, value) => {
    setConfigInput((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer?.files || []);
    setFiles((prev) => [...prev, ...dropped].slice(0, 5));
  }, []);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected].slice(0, 5));
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (websiteUrl) setLoadingMessage("Crawling your website…");
      
      const { bluesky_handle, ...restConfig } = configInput;
      
      const agent = await createAgent({
        agentType, name, description,
        websiteUrl: websiteUrl || null,
        forumUrl: forumUrl || null,
        forumType: forumUrl ? forumType : null,
        forumEmail: forumUrl ? (forumEmail || null) : null,
        forumPassword: forumUrl ? (forumPassword || null) : null,
        blueskyHandle: bluesky_handle || null,
        configInput: restConfig,
      });

      if (files.length > 0 && template.supportsUpload) {
        setLoadingMessage("Processing your documents…");
        await uploadFiles(agent.id, files);
      }

      router.push(`/success?slug=${agent.slug}&name=${encodeURIComponent(agent.name)}`);
    } catch (err) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="page">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="loading-spinner" />
            <h2>{loadingMessage}</h2>
            <p>This may take a moment — Gemini is reading your content</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="navbar" style={{ borderBottom: "1px solid var(--border)" }}>
        <Link href="/" className="navbar-logo">
          <img src="/logo.png" className="logo-icon" alt="Agent Squared Logo" />
          Agent Squared
        </Link>
        <div className="navbar-actions">
          <Link href="/dashboard" className="btn btn-ghost">← Dashboard</Link>
        </div>
      </nav>

      <div className="build-page">
        <div className="build-container">
          <div className="build-header">
            <h1>Create Your Agent</h1>
            <p>Configure your custom AI agent in a few steps.</p>
          </div>

          <div className="build-form-card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Agent Name</label>
                <input
                  className="form-input" type="text"
                  placeholder="e.g. Acme Support Bot"
                  value={name} onChange={(e) => setName(e.target.value)} required
                />
              </div>

              <div className="form-group">
                <label className="form-label">What does your company do?</label>
                <textarea
                  className="form-textarea"
                  placeholder="Describe your business services, target audience, and primary goals..."
                  value={description} onChange={(e) => setDescription(e.target.value)} required
                />
              </div>

              {template.supportsWebsite && (
                <div className="form-group">
                  <label className="form-label">Company Website URL</label>
                  <input
                    className="form-input" type="url"
                    placeholder="https://yourcompany.com"
                    value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                    We'll crawl your website to train the agent on your content
                  </p>
                </div>
              )}

              {template.supportsForum && (
                <div className="form-group">
                  <label className="form-label">Forum URL (optional)</label>
                  <input
                    className="form-input" type="url"
                    placeholder="https://yourcompany.com/forum"
                    value={forumUrl} onChange={(e) => setForumUrl(e.target.value)}
                  />
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                    Your agent can auto-answer unanswered questions on your forum
                  </p>

                  {/* Show credential fields when forum URL is entered */}
                  {forumUrl && (
                    <div style={{ marginTop: 16, padding: 16, background: "var(--bg-surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label">Forum Type</label>
                        <select
                          className="form-input"
                          value={forumType}
                          onChange={(e) => setForumType(e.target.value)}
                          style={{ height: 44 }}
                        >
                          <option value="auto">Auto-detect</option>
                          <option value="discourse">Discourse</option>
                          <option value="custom">Custom / Other</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label">Forum Login Email</label>
                        <input
                          className="form-input" type="email"
                          placeholder="agent@yourcompany.com"
                          value={forumEmail}
                          onChange={(e) => setForumEmail(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Forum Login Password</label>
                        <input
                          className="form-input" type="password"
                          placeholder="Forum account password"
                          value={forumPassword}
                          onChange={(e) => setForumPassword(e.target.value)}
                        />
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 8 }}>
                        🔒 Credentials are stored securely and used only by your agent
                      </p>
                    </div>
                  )}
                </div>
              )}

              {template.fields.map((field) => (
                <div className="form-group" key={field.name}>
                  <label className="form-label">{field.label}</label>
                  {field.type === "textarea" ? (
                    <textarea
                      className="form-textarea" placeholder={field.placeholder}
                      value={configInput[field.name] || ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      required={field.required !== false}
                    />
                  ) : (
                    <input
                      className="form-input" type="text" placeholder={field.placeholder}
                      value={configInput[field.name] || ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      required={field.required !== false}
                    />
                  )}
                </div>
              ))}

              {template.supportsUpload && (
                <div className="form-group">
                  <label className="form-label">Knowledge Base</label>
                  <div
                    className="upload-zone"
                    onDrop={handleFileDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => document.getElementById("file-input").click()}
                  >
                    <div className="upload-icon">📄</div>
                    <p>Click to upload or drag and drop</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      FAQs, PDF manuals, or text files (Max 50MB)
                    </p>
                    <input
                      id="file-input" type="file" multiple
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md"
                      onChange={handleFileSelect} style={{ display: "none" }}
                    />
                  </div>
                  {files.length > 0 && (
                    <ul className="file-list">
                      {files.map((f, i) => (
                        <li key={i}>
                          <span>{f.name}</span>
                          <button type="button" onClick={() => removeFile(i)}>✕</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {error && (
                <p style={{ color: "var(--error)", marginBottom: 16, fontSize: "0.9rem" }}>{error}</p>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: "100%" }}
                disabled={loading || !name || !description}>
                {loading ? "Building…" : "Build Agent ⚡"}
              </button>
            </form>
          </div>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.8rem", color: "var(--text-muted)" }}>
            © 2026 Agent Squared AI. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BuildPage() {
  return (
    <Suspense fallback={<div className="page build-page"><div className="build-container"><div className="loading-spinner" /></div></div>}>
      <BuildFormContent />
    </Suspense>
  );
}
