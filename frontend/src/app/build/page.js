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
      { name: "audience", label: "Target Audience", type: "text", placeholder: "e.g. B2B SaaS decision-makers" },
      { name: "goals", label: "Marketing Goals", type: "textarea", placeholder: "e.g. Increase brand awareness, drive demo signups" },
      { name: "brand_tone", label: "Brand Tone", type: "text", placeholder: "e.g. bold, witty, thought-leader" },
    ],
    supportsUpload: false,
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
  const [configInput, setConfigInput] = useState({});
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Building your agent…");
  const [error, setError] = useState("");

  // Auth guard
  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
    }
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
      // 1. Create the agent (this triggers website crawl + spec gen)
      if (websiteUrl) {
        setLoadingMessage("Crawling your website…");
      }
      const agent = await createAgent({
        agentType,
        name,
        description,
        websiteUrl: websiteUrl || null,
        forumUrl: forumUrl || null,
        configInput,
      });

      // 2. Upload files if any
      if (files.length > 0 && template.supportsUpload) {
        setLoadingMessage("Processing your documents…");
        await uploadFiles(agent.id, files);
      }

      // 3. Redirect to success page
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
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid var(--border-color)" }}>
        <Link href="/dashboard" style={{ textDecoration: "none", color: "var(--text-primary)", fontWeight: 700, fontSize: "1.1rem" }}>
          ← Dashboard
        </Link>
      </nav>

      <div className="build-page">
        <div className="build-container">
          <div className="build-header">
            <h1>
              Create a <span className="gradient-text">{template.label}</span>
            </h1>
            <p>Fill in the details and we'll build your AI agent instantly.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Agent Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Acme Support Bot"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Business Description</label>
              <textarea
                className="form-textarea"
                placeholder="Describe your business and what this agent should know about"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Website URL field (support_qa only) */}
            {template.supportsWebsite && (
              <div className="form-group">
                <label className="form-label">Company Website URL</label>
                <input
                  className="form-input"
                  type="url"
                  placeholder="https://yourcompany.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                  We'll crawl your website to train the agent on your content
                </p>
              </div>
            )}

            {/* Forum URL field (support_qa only) */}
            {template.supportsForum && (
              <div className="form-group">
                <label className="form-label">Forum URL (optional)</label>
                <input
                  className="form-input"
                  type="url"
                  placeholder="https://yourcompany.com/forum"
                  value={forumUrl}
                  onChange={(e) => setForumUrl(e.target.value)}
                />
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Your agent can auto-answer unanswered questions on your forum
                </p>
              </div>
            )}

            {template.fields.map((field) => (
              <div className="form-group" key={field.name}>
                <label className="form-label">{field.label}</label>
                {field.type === "textarea" ? (
                  <textarea
                    className="form-textarea"
                    placeholder={field.placeholder}
                    value={configInput[field.name] || ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    required={field.required !== false}
                  />
                ) : (
                  <input
                    className="form-input"
                    type="text"
                    placeholder={field.placeholder}
                    value={configInput[field.name] || ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    required={field.required !== false}
                  />
                )}
              </div>
            ))}

            {template.supportsUpload && (
              <div className="form-group">
                <label className="form-label">Knowledge Files (optional)</label>
                <div
                  className="upload-zone"
                  onDrop={handleFileDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => document.getElementById("file-input").click()}
                >
                  <div className="upload-icon">📄</div>
                  <p>Drop files here or click to browse</p>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    PDF, images, text — max 10 MB each, up to 5 files
                  </p>
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
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
              <p style={{ color: "var(--error)", marginBottom: 16, fontSize: "0.9rem" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={loading || !name || !description}
            >
              {loading ? "Building…" : "Create Agent →"}
            </button>
          </form>
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
