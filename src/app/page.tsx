"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/20">
              ⚡
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">API-Sync AI</span>
            <span className="hidden sm:inline-block text-2xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              BuildSprint 2026
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
            <a href="#how-it-works" className="hover:text-slate-900 transition">How It Works</a>
            <a href="#architecture" className="hover:text-slate-900 transition">Architecture</a>
            <Link href="/studio" className="hover:text-slate-900 transition">Review Studio</Link>
          </nav>

          <div className="flex items-center space-x-4">
            <Link
              href="/studio"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-md shadow-indigo-600/10 flex items-center space-x-2"
            >
              <span>Open Review Studio</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - Asymmetric Layout */}
      <section className="relative pt-20 pb-16 px-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
            <span>BuildSprint 2026 Official Entry</span>
            <span className="text-slate-400">•</span>
            <span>Gemini &amp; SkillPatch</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-none">
            Your API changed. <br />
            <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 bg-clip-text text-transparent">
              Your docs shouldn&apos;t fall behind.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
            API-Sync AI detects API documentation drift in GitHub pull requests, explains what became stale, and generates a reviewable fix before your team ships it.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link
              href="/studio"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3.5 rounded-xl text-sm transition shadow-lg shadow-indigo-600/20 flex items-center space-x-2"
            >
              <span>Open Review Studio</span>
              <span>→</span>
            </Link>
            <a
              href="#how-it-works"
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold px-6 py-3.5 rounded-xl text-sm transition shadow-sm"
            >
              See How It Works
            </a>
          </div>
        </div>

        {/* Product Transformation Visual Preview Card */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Live Drift Detection Example</span>
              <span className="text-indigo-600 font-mono">PR #11</span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="text-2xs font-semibold text-rose-700 uppercase tracking-wider">1. Code Change Detected</div>
                <div className="font-mono text-xs text-slate-800 bg-white p-2 border border-slate-200 rounded">
                  + router.get(&apos;/api/users/:id&apos;)
                </div>
                <p className="text-2xs text-slate-500">Added required :id parameter &amp; status 404</p>
              </div>

              <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg space-y-1">
                <div className="text-2xs font-semibold text-amber-800 uppercase tracking-wider">2. Gemini Flagged Drift</div>
                <p className="text-xs text-amber-900 leading-normal">
                  docs/api.md still documents GET /api/users without :id
                </p>
              </div>

              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-1">
                <div className="text-2xs font-semibold text-emerald-800 uppercase tracking-wider">3. SkillPatch Proposal</div>
                <p className="font-mono text-xs text-slate-900 bg-white p-2 border border-slate-200 rounded">
                  ### GET /api/users/:id
                </p>
                <p className="text-2xs text-slate-500">Formated endpoint table &amp; curl example</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-6 max-w-7xl mx-auto w-full border-t border-slate-200 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Progressive Pipeline</span>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">How API-Sync AI Works</h2>
          <p className="text-sm text-slate-600">
            A 4-step workflow combining zero-AI code extraction with evidence-grounded reasoning and human approval.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 shadow-sm">
            <div className="text-2xl font-extrabold text-indigo-600">01</div>
            <h3 className="text-base font-bold text-slate-900">Detect</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Fetches GitHub PR diffs and deterministically parses Express/Nest/FastAPI routes and Next.js handlers without AI guessing.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 shadow-sm">
            <div className="text-2xl font-extrabold text-indigo-600">02</div>
            <h3 className="text-base font-bold text-slate-900">Understand</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Gemini evaluates code changes against matching repository docs to pinpoint semantic drift with concrete evidence.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 shadow-sm">
            <div className="text-2xl font-extrabold text-indigo-600">03</div>
            <h3 className="text-base font-bold text-slate-900">Generate</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The installed SkillPatch <code className="text-indigo-700 font-mono">api-documentation</code> skill formats structured Markdown tables and curl examples.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 shadow-sm">
            <div className="text-2xl font-extrabold text-indigo-600">04</div>
            <h3 className="text-base font-bold text-slate-900">Sync</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Developer reviews the side-by-side proposal and approves one-click commit back to the PR branch.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture & Engineering Discipline */}
      <section id="architecture" className="py-20 px-6 max-w-7xl mx-auto w-full border-t border-slate-200 space-y-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-sm">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Reliable Engineering</span>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Deterministic Extraction + Gemini Reasoning + SkillPatch + Human Approval
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              API-Sync AI avoids raw AI hallucination by isolating code parsing, using evidence-grounded LLM drift detection, enforcing target files, and requiring explicit developer approval before any repository commits occur.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-semibold text-slate-900 mb-1">Deterministic Code Parser</div>
              <div className="text-slate-600 leading-normal">Zero-AI regex parser extracts route paths, path parameters, query parameters, and status codes.</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-semibold text-slate-900 mb-1">Gemini Model Router</div>
              <div className="text-slate-400 leading-normal"><span className="text-slate-600">Automatic fallback</span> (<code className="text-indigo-700 font-mono">3.7-flash</code> → <code className="text-indigo-700 font-mono">3.6-flash</code>) handles rate limits and model availability.</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-semibold text-slate-900 mb-1">SkillPatch Engine</div>
              <div className="text-slate-600 leading-normal">Consumes local <code className="text-indigo-700 font-mono">SKILL.md</code> instructions to format standard API tables and schemas.</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-semibold text-slate-900 mb-1">SHA Concurrency Sync</div>
              <div className="text-slate-600 leading-normal">Checks target file SHA on GitHub to prevent stale overwrites or concurrent conflicts.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Review Studio CTA Card */}
      <section className="py-16 px-6 max-w-7xl mx-auto w-full border-t border-slate-200">
        <div className="bg-gradient-to-tr from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="space-y-2 text-left">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Catch documentation drift before your next release.</h2>
            <p className="text-sm text-indigo-200">Connect GitHub or paste any pull request URL in the Review Studio.</p>
          </div>
          <Link
            href="/studio"
            className="bg-white hover:bg-slate-100 text-indigo-900 font-bold px-6 py-3.5 rounded-xl text-sm transition shadow-lg shrink-0"
          >
            Open Review Studio →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            API-Sync AI by team <span className="text-slate-800 font-semibold">LatentForce.ai</span> for BuildSprint 2026.
          </div>
          <div className="flex items-center space-x-4">
            <span>LatentCode</span>
            <span>•</span>
            <span>Gemini AI</span>
            <span>•</span>
            <span>SkillPatch</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
