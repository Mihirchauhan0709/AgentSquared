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

  // Load agent config
  useEffect(() => {
    if (!slug) return;
    getAgent(slug)
      .then(setAgent)
      .catch((e) => setError("Agent not found"));
  }, [slug]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;

    setInput("");
    setSending(true);
    setError("");

    // Optimistic UI — add user message immediately
    setMessages((prev) => [...prev, { role: "user", content: msg }]);

    try {
      const res = await sendMessage(slug, msg, sessionId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.response },
      ]);
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const spec = agent?.spec || {};
  const greeting = spec?.identity?.greeting || `Hi! I'm ${agent?.name || "your agent"}. How can I help?`;
  const starterPrompts = spec?.starter_prompts || [];

  if (error && !agent) {
    return (
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="card" style={{ textAlign: "center", maxWidth: 400 }}>
          <h2>😕 Agent not found</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: 8 }}>
            This agent doesn't exist or hasn't finished building yet.
          </p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="workspace">
      {/* Header */}
      <div className="workspace-header">
        <h2>{agent.name}</h2>
        <span className="agent-type-badge">
          {agent.agent_type === "support_qa" ? "💬 Support" : "📣 Marketing"}
        </span>
      </div>

      {/* Chat area */}
      <div className="chat-container">
        {messages.length === 0 && (
          <div className="chat-greeting">
            <h3>{greeting}</h3>
            {starterPrompts.length > 0 && (
              <div className="starter-prompts">
                {starterPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    className="starter-chip"
                    onClick={() => handleSend(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message message-${msg.role}`}>
            <div className="message-avatar">
              {msg.role === "user" ? "U" : "A"}
            </div>
            <div className="message-bubble">{msg.content}</div>
          </div>
        ))}

        {sending && (
          <div className="message message-assistant">
            <div className="message-avatar">A</div>
            <div className="message-bubble">
              <div className="thinking">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <div className="chat-input-bar">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask ${agent.name} something…`}
          rows={1}
          disabled={sending}
        />
        <button
          onClick={() => handleSend()}
          disabled={sending || !input.trim()}
          title="Send"
        >
          ↑
        </button>
      </div>

      {error && messages.length > 0 && (
        <div style={{ padding: "8px 24px", color: "var(--error)", fontSize: "0.85rem", textAlign: "center" }}>
          {error}
        </div>
      )}
    </div>
  );
}
