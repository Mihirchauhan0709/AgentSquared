"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isLoggedIn, getCompanyName, logout } from "@/lib/api";
import { useRouter } from "next/navigation";

const AGENT_TYPES = [
  {
    type: "support_qa",
    icon: "💬",
    label: "Customer Support Agent",
    description:
      "Answer customer questions grounded in your company's website, FAQ docs, and policies.",
  },
  {
    type: "social_marketing",
    icon: "📣",
    label: "Social Media Marketing Agent",
    description:
      "Generate LinkedIn posts, content ideas, and copy variations for your brand.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setCompanyName(getCompanyName());
  }, []);

  return (
    <div className="page">
      {/* Nav bar */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Agent²</span>
        <div style={{ display: "flex", gap: 8 }}>
          {loggedIn ? (
            <>
              <Link href="/dashboard" className="btn btn-ghost" style={{ padding: "6px 16px", fontSize: "0.85rem" }}>
                Dashboard
              </Link>
              <button
                className="btn btn-ghost"
                style={{ padding: "6px 16px", fontSize: "0.85rem" }}
                onClick={() => { logout(); setLoggedIn(false); router.push("/"); }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost" style={{ padding: "6px 16px", fontSize: "0.85rem" }}>
                Log in
              </Link>
              <Link href="/signup" className="btn btn-primary" style={{ padding: "6px 16px", fontSize: "0.85rem" }}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>

      <section className="hero">
        <span className="hero-badge">⚡ Build AI Agents for Your Business</span>
        <h1>
          Your Website,<br />
          <span className="gradient-text">Your AI Agent</span>
        </h1>
        <p>
          Enter your website URL, upload your docs, and get a live customer support
          agent — grounded in your actual content. No code required.
        </p>

        {loggedIn ? (
          <Link href="/build?type=support_qa" className="btn btn-primary" style={{ padding: "14px 32px", fontSize: "1rem" }}>
            Create Your Agent →
          </Link>
        ) : (
          <Link href="/signup" className="btn btn-primary" style={{ padding: "14px 32px", fontSize: "1rem" }}>
            Get Started Free →
          </Link>
        )}
      </section>

      <section className="container">
        <div className="templates-grid">
          {AGENT_TYPES.map((t) => (
            <div className="card template-card" key={t.type}>
              <div className="template-icon">{t.icon}</div>
              <h3>{t.label}</h3>
              <p>{t.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer
        style={{
          textAlign: "center",
          padding: "60px 24px 40px",
          color: "var(--text-muted)",
          fontSize: "0.85rem",
        }}
      >
        Agent² — HackCU 2026
      </footer>
    </div>
  );
}
