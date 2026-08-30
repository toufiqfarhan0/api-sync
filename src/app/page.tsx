"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface AuthState {
  authenticated: boolean;
  user?: {
    login: string;
    avatarUrl: string;
  };
  authMethod?: string;
}

export default function LandingPage() {
  const [auth, setAuth] = useState<AuthState>({ authenticated: false });
  const [activeTab, setActiveTab] = useState<"code" | "drift" | "proposal">("drift");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json: AuthState) => setAuth(json))
      .catch(() => setAuth({ authenticated: false }));
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Floating Pill Navigation */}
      <header className="sticky top-4 z-50 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="bg-white/80 backdrop-blur-md border border-[#e5e3dc] rounded-2xl px-5 py-3 shadow-[0_4px_20px_-4px_rgba(20,20,20,0.06),0_1px_2px_rgba(0,0,0,0.04)] flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="h-7 w-7 rounded-lg bg-[#0f0f0e] text-white flex items-center justify-center font-mono font-bold text-xs shadow-sm">
              a/s
            </div>
            <span className="text-base font-bold tracking-tight text-[#141413] font-mono group-hover:text-[#ea580c] transition-colors">
              api-sync
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-7 text-xs font-semibold text-[#66645e]">
            <a href="#how-it-works" className="hover:text-[#141413] transition-colors">How It Works</a>
            <a href="#architecture" className="hover:text-[#141413] transition-colors">Architecture</a>
            <a href="#telemetry" className="hover:text-[#141413] transition-colors">Diff Inspector</a>
            <Link href="/studio" className="hover:text-[#141413] transition-colors">Review Studio</Link>
          </nav>

          <div className="flex items-center space-x-3">
            {auth.authenticated && auth.user ? (
              <div className="flex items-center space-x-2 bg-[#f1efea] border border-[#e5e3dc] px-3 py-1 rounded-xl">
                <span className="text-xs text-[#141413] font-mono font-medium">@{auth.user.login}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              </div>
            ) : (
              <a
                href="/api/auth/github"
                className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold text-[#66645e] hover:text-[#141413] bg-[#f1efea] hover:bg-[#e8e5de] border border-[#e5e3dc] px-3 py-1.5 rounded-xl transition"
              >
                <span>Connect GitHub</span>
              </a>
            )}

            <Link
              href="/studio"
              className="bg-[#0f0f0e] hover:bg-[#262624] text-white font-medium px-4 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center space-x-1"
            >
              <span>Open Review Studio</span>
              <span className="text-neutral-400">→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-12 px-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border border-[#e5e3dc] text-[#141413] text-xs font-mono shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-[#ea580c]" />
            <span className="font-semibold">BuildSprint 2026</span>
            <span className="text-neutral-300">•</span>
            <span className="text-[#66645e]">SkillPatch Verified</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#141413] leading-[1.05]">
            Your API changed. <br />
            <span className="text-[#ea580c]">
              Your docs shouldn&apos;t fall behind.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[#66645e] max-w-xl leading-relaxed">
            api-sync analyzes GitHub pull requests for API route changes, detects documentation drift, generates a structured Markdown fix using Gemini &amp; SkillPatch, and commits approved updates back to your branch.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/studio"
              className="bg-[#0f0f0e] hover:bg-[#262624] text-white font-semibold px-6 py-3.5 rounded-xl text-sm transition shadow-md flex items-center space-x-2 group"
            >
              <span>Open Review Studio</span>
              <span className="text-neutral-400 group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
            <a
              href="#telemetry"
              className="bg-white hover:bg-[#faf9f5] text-[#141413] border border-[#e5e3dc] font-semibold px-6 py-3.5 rounded-xl text-sm transition shadow-2xs"
            >
              Inspect Live Demo
            </a>
          </div>

          <div className="pt-2 flex items-center space-x-6 text-xs font-mono text-[#66645e]">
            <div className="flex items-center space-x-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Zero AI Guessing</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>SHA Concurrency Check</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>84+ Unit Tests</span>
            </div>
          </div>
        </div>

        {/* Hero Interactive Telemetry Card */}
        <div className="lg:col-span-5" id="telemetry">
          <div className="bg-white border border-[#e6e4df] rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#f1efea] pb-3">
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-xs font-mono font-bold text-[#141413]">PR #11 Drift Inspector</span>
              </div>
              <span className="text-2xs font-mono px-2 py-0.5 rounded bg-[#fff7ed] text-[#ea580c] border border-[#ffedd5] font-semibold">
                CONFIRMED DRIFT
              </span>
            </div>

            {/* Interactive Tab Switcher */}
            <div className="flex space-x-1 bg-[#f6f5f2] p-1 rounded-xl text-xs font-medium border border-[#e5e3dc]">
              <button
                onClick={() => setActiveTab("code")}
                className={`flex-1 py-1.5 rounded-lg transition font-mono ${activeTab === "code" ? "bg-white text-[#141413] shadow-2xs font-bold" : "text-[#66645e] hover:text-[#141413]"}`}
              >
                1. Code Diff
              </button>
              <button
                onClick={() => setActiveTab("drift")}
                className={`flex-1 py-1.5 rounded-lg transition font-mono ${activeTab === "drift" ? "bg-white text-[#141413] shadow-2xs font-bold" : "text-[#66645e] hover:text-[#141413]"}`}
              >
                2. AI Diagnosis
              </button>
              <button
                onClick={() => setActiveTab("proposal")}
                className={`flex-1 py-1.5 rounded-lg transition font-mono ${activeTab === "proposal" ? "bg-white text-[#141413] shadow-2xs font-bold" : "text-[#66645e] hover:text-[#141413]"}`}
              >
                3. SkillPatch Fix
              </button>
            </div>

            {/* Tab Contents */}
            <div className="min-h-[220px]">
              {activeTab === "code" && (
                <div className="bg-[#faf9f6] border border-[#e5e3dc] rounded-xl p-3.5 space-y-2 font-mono text-xs text-[#141413]">
                  <div className="text-2xs text-[#66645e] flex justify-between">
                    <span>src/app/api/test-users/[id]/route.ts</span>
                    <span className="text-emerald-700 font-bold">+ MODIFIED</span>
                  </div>
                  <pre className="text-2xs bg-white p-2.5 rounded border border-[#e5e3dc] overflow-x-auto text-slate-800 leading-relaxed">
                    <span className="text-rose-700">- export async function GET() &#123;</span>{"\n"}
                    <span className="text-emerald-700">+ export async function GET(req, &#123; params &#125;) &#123;</span>{"\n"}
                    <span className="text-emerald-700">+   const &#123; id &#125; = params;</span>{"\n"}
                    <span className="text-emerald-700">+   if (!user) return NextResponse.json(..., &#123; status: 404 &#125;);</span>
                  </pre>
                  <p className="text-2xs text-[#66645e]">Deterministic parser extracted: <code className="text-[#ea580c]">GET /api/test-users/:id</code> with path param <code className="text-[#ea580c]">:id</code> &amp; status <code className="text-[#ea580c]">404</code>.</p>
                </div>
              )}

              {activeTab === "drift" && (
                <div className="bg-[#fff7ed] border border-[#ffedd5] rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-2xs font-mono">
                    <span className="font-bold text-[#ea580c]">Gemini 3.7 Flash Reasoning</span>
                    <span className="text-[#66645e]">Confidence: HIGH</span>
                  </div>
                  <p className="text-xs text-neutral-800 font-medium leading-relaxed">
                    Documentation file <code className="font-mono text-[#ea580c] bg-white px-1 py-0.5 rounded border border-[#ffedd5]">docs/api.md</code> lists <code className="font-mono">GET /api/test-users</code> without the required <code className="font-mono">:id</code> parameter or <code className="font-mono">404 Not Found</code> response code.
                  </p>
                  <div className="pt-1 text-2xs font-mono text-neutral-600">
                    Evidence: Route parameter <code className="text-neutral-900 font-bold">:id</code> present in code diff but missing in docs.
                  </div>
                </div>
              )}

              {activeTab === "proposal" && (
                <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-3.5 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-2xs text-emerald-800 font-bold">
                    <span>SkillPatch: api-documentation</span>
                    <span>Target: docs/api.md</span>
                  </div>
                  <pre className="text-2xs bg-white p-2.5 rounded border border-[#bbf7d0] overflow-x-auto text-emerald-900 leading-relaxed">
                    ### GET /api/test-users/:id{"\n\n"}
                    | Parameter | Type | Required | Description |{"\n"}
                    | :--- | :--- | :--- | :--- |{"\n"}
                    | id | string | Yes | Target user ID |{"\n\n"}
                    **Responses:** 200 OK, 404 Not Found
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#f1efea] flex items-center justify-between">
              <span className="text-2xs text-[#66645e] font-mono">Ready for developer review &amp; 1-click sync</span>
              <Link href="/studio" className="text-xs font-bold text-[#ea580c] hover:underline flex items-center space-x-1">
                <span>Test in Studio</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-6 max-w-7xl mx-auto w-full border-t border-[#e6e4df] space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-[#ea580c] font-mono uppercase tracking-wider">3-Stage Progressive Pipeline</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#141413] tracking-tight">How api-sync Operates</h2>
          <p className="text-sm text-[#66645e]">
            Isolated deterministic extraction combined with evidence-grounded AI reasoning and explicit human approval.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white border border-[#e6e4df] rounded-2xl p-7 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-[#d6d3cc] transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#ea580c] bg-[#fff7ed] px-2.5 py-1 rounded-md border border-[#ffedd5]">STAGE 01</span>
              <span className="text-2xs font-mono text-[#66645e]">Zero AI Guessing</span>
            </div>
            <h3 className="text-lg font-bold text-[#141413]">Deterministic Parse &amp; Match</h3>
            <p className="text-xs text-[#66645e] leading-relaxed">
              Fetches GitHub PR diffs via Octokit. Deterministic regex parsers extract route paths, HTTP methods, path params, and status codes from Express, Nest, FastAPI, and Next.js handlers. Matches exact Markdown sections in <code className="text-[#141413] font-mono font-semibold">docs/*.md</code>.
            </p>
          </div>

          <div className="bg-white border border-[#e6e4df] rounded-2xl p-7 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-[#d6d3cc] transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#ea580c] bg-[#fff7ed] px-2.5 py-1 rounded-md border border-[#ffedd5]">STAGE 02</span>
              <span className="text-2xs font-mono text-[#66645e]">Model Router</span>
            </div>
            <h3 className="text-lg font-bold text-[#141413]">Gemini Semantic Drift Engine</h3>
            <p className="text-xs text-[#66645e] leading-relaxed">
              Prompts Gemini using evidence-grounded system rules to detect documentation inconsistencies. Shared model router automatically falls back across <code className="text-[#141413] font-mono">3.7-flash</code> → <code className="text-[#141413] font-mono">3.6-flash</code> → <code className="text-[#141413] font-mono">3.5-lite</code> to guarantee uptime.
            </p>
          </div>

          <div className="bg-white border border-[#e6e4df] rounded-2xl p-7 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-[#d6d3cc] transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#ea580c] bg-[#fff7ed] px-2.5 py-1 rounded-md border border-[#ffedd5]">STAGE 03</span>
              <span className="text-2xs font-mono text-[#66645e]">Human-in-the-Loop</span>
            </div>
            <h3 className="text-lg font-bold text-[#141413]">SkillPatch &amp; SHA Sync</h3>
            <p className="text-xs text-[#66645e] leading-relaxed">
              Loads the installed SkillPatch <code className="text-[#141413] font-mono font-semibold">api-documentation</code> skill to format structured Markdown. The developer inspects side-by-side diffs in the Review Studio and approves 1-click commit back to the PR branch.
            </p>
          </div>
        </div>
      </section>

      {/* Technical Architecture Ribbon */}
      <section id="architecture" className="py-20 px-6 max-w-7xl mx-auto w-full border-t border-[#e6e4df] space-y-8">
        <div className="bg-white border border-[#e6e4df] rounded-3xl p-8 sm:p-10 space-y-8 shadow-[0_4px_20px_-4px_rgba(20,20,20,0.04)]">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c] font-mono">Architecture &amp; Security</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#141413] tracking-tight">
              Engineered for Precision &amp; Developer Safety
            </h2>
            <p className="text-sm text-[#66645e] leading-relaxed">
              No unvetted background workers, no unverified auto-commits, no plaintext token cookies, and no hallucinated API parameters.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
            <div className="p-5 bg-[#faf9f6] rounded-2xl border border-[#e5e3dc] space-y-2">
              <div className="font-bold text-[#141413]">AES-256-GCM Auth Cookies</div>
              <div className="text-[#66645e] leading-relaxed">GitHub OAuth user tokens are encrypted server-side using dedicated <code className="font-mono text-[#141413]">SESSION_SECRET</code> keys.</div>
            </div>
            <div className="p-5 bg-[#faf9f6] rounded-2xl border border-[#e5e3dc] space-y-2">
              <div className="font-bold text-[#141413]">SHA Concurrency Guard</div>
              <div className="text-[#66645e] leading-relaxed">Verifies target file SHA on GitHub prior to sync, preventing stale overwrites if files changed concurrently.</div>
            </div>
            <div className="p-5 bg-[#faf9f6] rounded-2xl border border-[#e5e3dc] space-y-2">
              <div className="font-bold text-[#141413]">Deterministic Target Lock</div>
              <div className="text-[#66645e] leading-relaxed">Enforces updating the exact matched documentation file (<code className="font-mono text-[#141413]">docs/api.md</code>) rather than inventing arbitrary filenames.</div>
            </div>
            <div className="p-5 bg-[#faf9f6] rounded-2xl border border-[#e5e3dc] space-y-2">
              <div className="font-bold text-[#141413]">100% Offline Test Isolation</div>
              <div className="text-[#66645e] leading-relaxed">84+ unit tests pass via Vitest with mock clients, zero live network dependencies, and clean production builds.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Review Studio CTA Card */}
      <section className="py-16 px-6 max-w-7xl mx-auto w-full border-t border-[#e6e4df]">
        <div className="bg-[#0f0f0e] rounded-3xl p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="space-y-2 text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Catch documentation drift before your next release.</h2>
            <p className="text-sm text-neutral-400">Connect GitHub or paste any open pull request URL in the Review Studio.</p>
          </div>
          <Link
            href="/studio"
            className="bg-white hover:bg-neutral-100 text-[#0f0f0e] font-bold px-7 py-3.5 rounded-xl text-sm transition shadow-md shrink-0"
          >
            Open Review Studio →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e6e4df] bg-white py-8 px-6 text-center text-xs text-[#66645e]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-mono font-bold text-[#141413]">api-sync</span> for BuildSprint 2026.
          </div>
          <div className="flex items-center space-x-4 text-2xs font-mono text-[#66645e]">
            <span>LatentCode</span>
            <span>•</span>
            <span>Gemini</span>
            <span>•</span>
            <span>SkillPatch api-documentation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
