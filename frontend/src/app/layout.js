import "./globals.css";

export const metadata = {
  title: "Agent Squared — Create AI Agents in 60 Seconds",
  description:
    "A no-code platform for small businesses to create task-specific AI agents. Build customer support bots, marketing assistants, and more — no engineering required.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
