"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { getAgent, sendMessage } from "@/lib/api";
import Link from "next/link";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function generateSessionId() {
  return "sess_" + Math.random().toString(36).substring(2, 10);
}

export default function AgentWorkspace() {
  const { slug } = useParams();
  const [agent, setAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sessionId] = useState(() => generateSessionId());
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!slug) return;
    getAgent(slug)
      .then(setAgent)
      .catch(() => setError("Agent not found"));
  }, [slug]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;

    setInput("");
    const imgToSend = attachment;
    setAttachment(null);
    setSending(true);
    setError("");
    
    const userMsg = { role: "user", content: msg };
    if (imgToSend) userMsg.image = imgToSend;
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await sendMessage(slug, msg, sessionId, imgToSend);
      setMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
    } catch (err) {
      const errMsg = err.message || "Failed to get response";
      if (errMsg.includes("429") || errMsg.includes("rate limit")) {
        setError("Rate limit reached — please wait a few seconds and try again.");
      } else {
        setError(errMsg);
      }
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError("Only images are allowed (JPG, PNG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachment(event.target.result);
      setError("");
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input to allow attaching same file again
  };

  const spec = agent?.spec || {};
  const greeting = spec?.identity?.greeting || `Hi! I'm ${agent?.name || "your agent"}. How can I help?`;
  const starterPrompts = spec?.starter_prompts || [];

  if (error && !agent) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h2>😕 Agent not found</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: 8 }}>
            This agent doesn&apos;t exist or hasn&apos;t finished building yet.
          </p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="auth-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="workspace">
      {/* ── Sidebar ────────────────────────────────── */}
      <aside className="chat-sidebar">
        <div style={{ padding: "20px 24px 0", marginBottom: "-10px" }}>
          <Link href="/dashboard" className="btn btn-ghost" style={{ padding: 0, justifyContent: "flex-start", color: "var(--text-muted)", fontSize: "0.85rem", textDecoration: "none" }}>
            ← Back to Dashboard
          </Link>
        </div>
        <div className="chat-sidebar-header">
          <h3>{agent.name}</h3>
          <p>Customer Workspace</p>
        </div>

        <div className="chat-sidebar-info">
          <h4>About our support</h4>
          <p>Our AI-powered workspace helps you get instant answers about our services, billing, and technical setup 24/7.</p>
        </div>

        <ul className="chat-sidebar-nav">
          <li className="active">🟦 Active Support</li>
          {agent.agent_type === "social_monitor" && (
            <li>
              <Link href={`/social/${agent.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                🦋 Social Dashboard
              </Link>
            </li>
          )}
          <li>💬 Conversation History</li>
          <li>📘 Help Center</li>
        </ul>

        <div className="chat-sidebar-footer">
          <div className="sidebar-user-avatar" style={{ width: 28, height: 28, fontSize: "0.7rem" }}>G</div>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>Guest User</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Customer</div>
          </div>
        </div>
      </aside>

      {/* ── Main Chat ──────────────────────────────── */}
      <div className="chat-main">
        <div className="workspace-header">
          <div className="workspace-header-left">
            <span className="agent-type-badge">
              {agent.agent_type === "support_qa" ? "💬 Support" : agent.agent_type === "social_monitor" ? "🦋 Social Monitor" : "📣 Marketing"}
            </span>
            <h2>{agent.name}</h2>
          </div>
          <div className="online-badge">
            <span className="online-dot" />
            AI Assistant Online
          </div>
        </div>

        <div className="chat-container">
          {messages.length === 0 && (
            <>
              <div className="chat-date-separator">Today</div>
              <div className="chat-greeting">
                <div className="message message-assistant" style={{ maxWidth: "none", alignSelf: "center" }}>
                  <div className="message-avatar">A</div>
                  <div>
                    <div className="message-bubble">{greeting}</div>
                    <div className="message-time">Just now</div>
                  </div>
                </div>
              </div>
              {starterPrompts.length > 0 && (
                <div className="starter-prompts">
                  {starterPrompts.map((prompt, i) => (
                    <button key={i} className="starter-chip" onClick={() => handleSend(prompt)}>
                      💬 {prompt}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`message message-${msg.role}`}>
              <div className="message-avatar">
                {msg.role === "user" ? "U" : "A"}
              </div>
              <div>
                <div className="message-bubble">
                  {msg.image && (
                    <img src={msg.image} alt="Attachment" style={{ width: "100%", maxWidth: 250, borderRadius: 8, display: 'block', marginBottom: 8, objectFit: 'contain', background: '#fff' }} />
                  )}
                  {msg.role === "assistant" ? (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p({children}) { return <p style={{ margin: '4px 0', wordBreak: 'break-word' }}>{children}</p> },
                        img({node, ...props}) { return <img {...props} style={{ width: '100%', borderRadius: '8px', marginTop: '10px', display: 'block' }} alt={props.alt || ''} /> },
                        a({node, ...props}) { return <a {...props} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>{props.children}</a> }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : msg.content}
                </div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="message message-assistant">
              <div className="message-avatar">A</div>
              <div className="message-bubble">
                <div className="thinking"><span /><span /><span /></div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input & Image Preview */}
        <div className="chat-input-wrapper" style={{ padding: "0 24px", paddingBottom: "16px" }}>
          {/* Image Preview Thumbnail */}
          {attachment && (
            <div style={{ marginBottom: "-10px", padding: "8px 16px", background: "var(--bg-card)", borderRadius: "12px 12px 0 0", border: "1px solid var(--border)", borderBottom: "none", display: "inline-block", position: "relative", zIndex: 1, boxShadow: "0 -2px 10px rgba(0,0,0,0.02)" }}>
              <div style={{ position: "relative", width: "fit-content" }}>
                <img src={attachment} alt="Preview" style={{ height: "60px", width: "auto", borderRadius: "8px", objectFit: "cover", display: 'block' }} />
                <button onClick={() => setAttachment(null)} style={{ position: "absolute", top: -8, right: -8, background: "var(--text-primary)", color: "var(--bg-card)", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "bold" }}>
                  ×
                </button>
              </div>
            </div>
          )}
          
          <div className="chat-input-bar" style={{ margin: 0, position: "relative", zIndex: 2, borderRadius: attachment ? "0 12px 12px 12px" : "100px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
            {agent.agent_type === "social_marketing" && (
              <>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/jpg, image/webp" 
                  style={{ display: "none" }} 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-ghost" style={{ padding: "8px", borderRadius: "50%", minWidth: "40px", height: "40px", marginRight: "8px", color: "var(--primary)" }} title="Upload Image">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </button>
              </>
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask a question...`}
              rows={1}
              disabled={sending}
              style={{ paddingTop: '10px' }}
            />
            <button onClick={() => handleSend()} disabled={sending || !input.trim()}>
              Send
            </button>
          </div>
        </div>

        {error && messages.length > 0 && (
          <div style={{ padding: "8px 24px", color: "var(--error)", fontSize: "0.85rem", textAlign: "center" }}>
            {error}
          </div>
        )}

        <div className="chat-footer">
          Powered by <strong>Agent Squared</strong> ⚡
        </div>
      </div>
    </div>
  );
}
