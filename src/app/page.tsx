"use client";

import { useState } from "react";

interface ApiChangeItem {
  method: string;
  path: string;
  changeType: string;
  filePath: string;
}

interface DocContextItem {
  matchedFile: string;
  matchReason: string;
  confidence: string;
  matchedSections: { headingTitle?: string; contentSnippet: string }[];
}

interface DriftAnalysisData {
  status: "CONFIRMED_DRIFT" | "NO_DRIFT" | "UNCERTAIN";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
  summary: string;
  explanation: string;
  affectedApiChangesCount: number;
  affectedDocFiles: string[];
  missingInformation: string[];
  outdatedInformation: string[];
  confidence: string;
  reasoningEvidence: string[];
}

interface GenerationData {
  success: boolean;
  targetFile: string;
  generatedContent: string;
  summary: string;
  warnings: string[];
  confidence: string;
}

interface AnalysisResponse {
  success: boolean;
  error?: string;
  prMetadata?: {
    owner: string;
    repo: string;
    number: number;
    title: string;
    htmlUrl: string;
    author: { login: string };
    head: { ref: string; sha: string };
    base: { ref: string; sha: string };
  };
  summary?: { additions: number; deletions: number; changedFilesCount: number };
  apiChanges?: ApiChangeItem[];
  docContexts?: DocContextItem[];
  driftAnalysis?: DriftAnalysisData;
  generationResult?: GenerationData | null;
}

interface SyncResponse {
  success: boolean;
  repository: string;
  branch: string;
  filePath: string;
  commitSha?: string;
  commitUrl?: string;
  status: "SYNCED" | "CONFLICT" | "UNAUTHORIZED" | "NOT_FOUND" | "FAILED";
  message: string;
}

export default function ReviewStudioPage() {
  const [repoInput, setRepoInput] = useState("");
  const [pullNumberInput, setPullNumberInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [reviewState, setReviewState] = useState<"IDLE" | "APPROVED" | "REJECTED">("IDLE");
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoInput.trim()) {
      setError("Please enter a GitHub repository URL or owner/repo format.");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setReviewState("IDLE");
    setSyncResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoInput,
          pullNumber: pullNumberInput ? parseInt(pullNumberInput, 10) : undefined,
        }),
      });

      const json: AnalysisResponse = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to analyze repository documentation drift.");
      }

      setData(json);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || "An unexpected error occurred during analysis.");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToGitHub = async () => {
    if (!data || !data.prMetadata || !data.generationResult) return;

    setSyncing(true);
    setError(null);

    // Derive owner and repo safely
    const inputParts = repoInput.replace(/https?:\/\/github\.com\//i, "").split("/");
    const owner = data.prMetadata.owner || inputParts[0];
    const repo = data.prMetadata.repo || inputParts[1];

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo,
          pullNumber: data.prMetadata.number,
          filePath: data.generationResult.targetFile,
          content: data.generationResult.generatedContent,
        }),
      });

      const json: SyncResponse = await res.json();
      setSyncResult(json);

      if (json.success) {
        setReviewState("APPROVED");
      } else {
        if (json.status === "CONFLICT") {
          setError("Documentation file has been modified on GitHub. Please re-analyze before syncing.");
        } else {
          setError(json.message || "Failed to synchronize documentation to GitHub.");
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || "An unexpected error occurred during GitHub sync.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              ⚡
            </div>
            <span className="text-xl font-bold tracking-tight text-white">API-Sync AI</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              BuildSprint 2026
            </span>
          </div>
          <div className="text-sm text-slate-400">
            Automated API Documentation Drift & Review Studio
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {/* Input Card */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-2">Analyze Pull Request</h2>
          <p className="text-sm text-slate-400 mb-6">
            Enter a GitHub Pull Request URL or repository name to detect API documentation drift and preview synchronized updates.
          </p>

          <form onSubmit={handleAnalyze} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8">
              <label htmlFor="repoInput" className="block text-xs font-medium text-slate-400 mb-1">
                GitHub Repository or PR URL
              </label>
              <input
                id="repoInput"
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="https://github.com/owner/repo/pull/1 or owner/repo"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="pullNumberInput" className="block text-xs font-medium text-slate-400 mb-1">
                PR # (Optional if in URL)
              </label>
              <input
                id="pullNumberInput"
                type="number"
                value={pullNumberInput}
                onChange={(e) => setPullNumberInput(e.target.value)}
                placeholder="1"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={loading || syncing}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-medium py-2.5 px-4 rounded-lg transition text-sm flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20"
              >
                {loading ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Analyze Drift</span>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              ⚠️ {error}
            </div>
          )}
        </section>

        {/* Results Area */}
        {data && (
          <div className="space-y-8 animate-fadeIn">
            {/* PR Summary Bar */}
            {data.prMetadata && (
              <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      PR #{data.prMetadata.number}
                    </span>
                    <h3 className="text-lg font-bold text-white">{data.prMetadata.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Author: <span className="text-slate-300 font-medium">@{data.prMetadata.author.login}</span> • Branch: <span className="font-mono text-slate-300">{data.prMetadata.head.ref}</span> → <span className="font-mono text-slate-300">{data.prMetadata.base.ref}</span>
                  </p>
                </div>

                {data.summary && (
                  <div className="flex items-center space-x-4 text-xs font-mono">
                    <span className="text-emerald-400">+{data.summary.additions}</span>
                    <span className="text-rose-400">-{data.summary.deletions}</span>
                    <span className="text-slate-400">{data.summary.changedFilesCount} files changed</span>
                  </div>
                )}
              </section>
            )}

            {/* Detected API Changes Panel */}
            {data.apiChanges && data.apiChanges.length > 0 && (
              <section className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
                  Detected API Code Changes ({data.apiChanges.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.apiChanges.map((change, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded font-mono ${
                          change.method === "GET" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          change.method === "POST" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                          change.method === "PUT" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          {change.method}
                        </span>
                        <span className="font-mono text-sm text-slate-200">{change.path}</span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">{change.changeType}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Drift Status Banner & Reasoning Card */}
            {data.driftAnalysis && (
              <section className={`border rounded-xl p-6 ${
                data.driftAnalysis.status === "CONFIRMED_DRIFT" ? "bg-rose-950/20 border-rose-500/30" :
                data.driftAnalysis.status === "NO_DRIFT" ? "bg-emerald-950/20 border-emerald-500/30" :
                "bg-amber-950/20 border-amber-500/30"
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      data.driftAnalysis.status === "CONFIRMED_DRIFT" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                      data.driftAnalysis.status === "NO_DRIFT" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                      "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}>
                      {data.driftAnalysis.status.replace("_", " ")}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      Severity: <span className="text-white">{data.driftAnalysis.severity}</span>
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    AI Confidence: {data.driftAnalysis.confidence}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{data.driftAnalysis.summary}</h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-6">{data.driftAnalysis.explanation}</p>

                {data.driftAnalysis.missingInformation.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2">Missing Information in Docs:</h4>
                    <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                      {data.driftAnalysis.missingInformation.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.driftAnalysis.reasoningEvidence.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Grounding Evidence:</h4>
                    <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 font-mono">
                      {data.driftAnalysis.reasoningEvidence.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* Side-by-Side Documentation Studio */}
            {data.driftAnalysis?.status !== "NO_DRIFT" && (
              <section className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                    Side-by-Side Documentation Studio
                  </h3>
                  <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20 font-mono">
                    SkillPatch: api-documentation
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Existing Doc */}
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col h-96">
                    <div className="text-xs font-bold text-slate-400 border-b border-slate-800 pb-2 mb-3 flex items-center justify-between">
                      <span>Current Repository Documentation Snippet</span>
                      <span className="text-slate-500 font-mono">
                        {data.docContexts?.[0]?.matchedFile || "README.md"}
                      </span>
                    </div>
                    <pre className="text-xs text-slate-300 font-mono overflow-auto flex-1 p-2 bg-slate-900/50 rounded whitespace-pre-wrap leading-relaxed">
                      {data.docContexts?.[0]?.matchedSections?.[0]?.contentSnippet || "No existing matching section found in repository."}
                    </pre>
                  </div>

                  {/* Right: SkillPatch Proposal */}
                  <div className="bg-slate-950 border border-indigo-500/30 rounded-lg p-4 flex flex-col h-96">
                    <div className="text-xs font-bold text-indigo-400 border-b border-slate-800 pb-2 mb-3 flex items-center justify-between">
                      <span>Proposed Documentation Update (SkillPatch)</span>
                      <span className="text-indigo-400 font-mono">
                        {data.generationResult?.targetFile || "README.md"}
                      </span>
                    </div>
                    <pre className="text-xs text-emerald-300 font-mono overflow-auto flex-1 p-2 bg-slate-900/50 rounded whitespace-pre-wrap leading-relaxed">
                      {data.generationResult?.generatedContent || "Generating documentation update..."}
                    </pre>
                  </div>
                </div>

                {/* Review & Sync Action Controls */}
                <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-400">
                    {syncResult?.status === "SYNCED" && (
                      <div className="text-emerald-400 font-semibold space-y-1">
                        <div>✓ Successfully synchronized to branch <span className="font-mono">{syncResult.branch}</span>!</div>
                        {syncResult.commitSha && (
                          <div className="text-xs text-slate-400 font-mono">
                            Commit:{" "}
                            {syncResult.commitUrl ? (
                              <a
                                href={syncResult.commitUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="underline text-indigo-400 hover:text-indigo-300"
                              >
                                {syncResult.commitSha.substring(0, 7)}
                              </a>
                            ) : (
                              syncResult.commitSha.substring(0, 7)
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {syncResult?.status === "CONFLICT" && (
                      <span className="text-amber-400 font-semibold">
                        ⚠️ Documentation changed on GitHub. Please re-analyze before syncing.
                      </span>
                    )}
                    {reviewState === "REJECTED" && (
                      <span className="text-rose-400 font-semibold">
                        ✕ Proposal Rejected by Developer.
                      </span>
                    )}
                    {reviewState === "IDLE" && !syncResult && (
                      <span>Inspect proposal and approve when ready to commit to GitHub PR branch.</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setReviewState("REJECTED")}
                      disabled={syncing || reviewState === "REJECTED"}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      Reject
                    </button>
                    <button
                      onClick={handleSyncToGitHub}
                      disabled={syncing || syncResult?.status === "SYNCED"}
                      className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white transition flex items-center space-x-2 shadow-lg shadow-emerald-600/20"
                    >
                      {syncing ? (
                        <>
                          <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                          <span>Syncing to GitHub...</span>
                        </>
                      ) : syncResult?.status === "SYNCED" ? (
                        <span>Synced to GitHub ✓</span>
                      ) : (
                        <span>Approve & Sync to GitHub</span>
                      )}
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
