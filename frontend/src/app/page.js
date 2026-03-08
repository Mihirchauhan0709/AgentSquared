"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { isLoggedIn, logout, getCompanyName } from "@/lib/api";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [company, setCompany] = useState("");

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setCompany(getCompanyName() || "");
  }, []);

  const handleLogout = () => {
    logout();
    setLoggedIn(false);
    setCompany("");
  };

  return (
    <div className="page">
      {/* ── Navbar ────────────────────────────────────── */}
      <nav className="navbar">
        <Link href="/" className="navbar-logo">
          <span className="logo-icon">A²</span>
          Agent Squared
        </Link>
        <ul className="navbar-links">
          <li><a href="#how-it-works">How it works</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#pricing">Pricing</a></li>
        </ul>
        <div className="navbar-actions">
          {loggedIn ? (
            <>
              <Link href="/dashboard" className="btn btn-ghost">Dashboard</Link>
              <button onClick={handleLogout} className="btn btn-secondary">Log out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">Log in</Link>
              <Link href="/signup" className="btn btn-primary">Sign Up</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-badge">✨ No-code AI agents for SMBs</div>
        <h1>
          Create a company support AI agent{" "}
          <span className="gradient-text">in minutes</span>
        </h1>
        <p>
          Empower your business with an intelligent assistant that handles customer queries 24/7 without writing a single line of code.
        </p>
        <div className="hero-buttons">
          <Link href={loggedIn ? "/dashboard" : "/signup"} className="btn btn-primary">
            Get Started Free →
          </Link>
          <a href="#how-it-works" className="btn btn-secondary">
            See How It Works
          </a>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────── */}
      <section className="how-it-works" id="how-it-works">
        <h2>How it works</h2>
        <p>Go from zero to a live support agent in three simple steps.</p>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Describe company</h3>
            <p>Tell us about your brand voice, values, and core goals.</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Upload knowledge</h3>
            <p>Sync your docs, PDFs, FAQs, and help center articles instantly.</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Get live agent URL</h3>
            <p>Deploy your agent to any website or platform instantly with a link.</p>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────── */}
      <section className="features" id="features">
        <h2>Built for SMB growth</h2>
        <p>Everything you need to automate customer support without technical complexity.</p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <span className="material-icons-outlined">schedule</span>
            </div>
            <h3>24/7 support</h3>
            <p>Your agent never sleeps, handling inquiries even on weekends and holidays.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <span className="material-icons-outlined">bolt</span>
            </div>
            <h3>Instant answers</h3>
            <p>Zero wait times for customers with real-time AI processing and intelligence.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <span className="material-icons-outlined">code_off</span>
            </div>
            <h3>No-code setup</h3>
            <p>Our intuitive interface is designed for humans, not just developers.</p>
          </div>
        </div>
      </section>

      {/* ── CTA / Pricing ─────────────────────────────── */}
      <section className="cta-section" id="pricing">
        <h2>Ready to scale your support?</h2>
        <p>Join hundreds of growing businesses using Agent Squared to delight their customers.</p>
        <div className="cta-card">
          <div className="cta-price">$49<span>/mo</span></div>
          <ul className="cta-features">
            <li><span className="check-icon">✓</span> Unlimited customer chats</li>
            <li><span className="check-icon">✓</span> Custom knowledge base training</li>
            <li><span className="check-icon">✓</span> Multilingual support (50+ languages)</li>
            <li><span className="check-icon">✓</span> Forum auto-answer integration</li>
          </ul>
          <Link href={loggedIn ? "/dashboard" : "/signup"} className="btn btn-primary">
            Get Started Free →
          </Link>
          <p style={{ fontSize: "0.8rem", marginTop: 12, opacity: 0.7 }}>No credit card required to start.</p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer className="footer">
        <span>© 2026 Agent Squared AI. All rights reserved.</span>
        <div className="footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </div>
  );
}
