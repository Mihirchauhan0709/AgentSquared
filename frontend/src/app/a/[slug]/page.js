"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { getAgent, sendMessage } from "@/lib/api";

function generateSessionId() {
  return "sess_" + Math.random().toString(36).substring(2, 10);
}

export default function AgentWorkspace() {
  const { slug } = useParams();
  const [agent, setAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sessionId] = useState(() => generateSessionId());
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

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
    setSending(true);
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);

    try {
      const res = await sendMessage(slug, msg, sessionId);
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
              {agent.agent_type === "support_qa" ? "💬 Support" : "📣 Marketing"}
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
                <div className="message-bubble">{msg.content}</div>
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

        {/* Input */}
        <div className="chat-input-bar">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask a question...`}
            rows={1}
            disabled={sending}
          />
          <button onClick={() => handleSend()} disabled={sending || !input.trim()}>
            Send
          </button>
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
