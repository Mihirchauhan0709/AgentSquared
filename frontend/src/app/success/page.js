"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");
  const name = searchParams.get("name") || "Your Agent";
  const [copied, setCopied] = useState(false);

  const agentUrl = typeof window !== "undefined"
    ? `${window.location.origin}/a/${slug}`
    : `/a/${slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(agentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="success-page">
      <div className="success-card card">
        <div className="success-icon">🎉</div>
        <h1>{name} is Live!</h1>
        <p>Your AI agent is ready. Share the link below with your customers.</p>

        <div className="url-box">
          <input type="text" value={agentUrl} readOnly />
          <button onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</button>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href={`/a/${slug}`} className="btn btn-primary">
            Open Workspace →
          </Link>
          <Link href="/" className="btn btn-ghost">
            Create Another
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="success-page"><div className="loading-spinner" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
