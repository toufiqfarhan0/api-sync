"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

interface ModelMetadata {
  modelUsed: string;
  fallbackUsed: boolean;
  attemptedModels: string[];
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
  modelMetadata?: ModelMetadata;
}

interface GenerationData {
  success: boolean;
  targetFile: string;
  generatedContent: string;
  summary: string;
  warnings: string[];
  confidence: string;
  modelMetadata?: ModelMetadata;
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

interface AuthState {
  authenticated: boolean;
  user?: {
    login: string;
    avatarUrl: string;
  };
  authMethod?: string;
}

interface RepoOption {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  isPrivate: boolean;
}

interface PROption {
  number: number;
  title: string;
  author: string;
  headRef: string;
  baseRef: string;
  isDraft: boolean;
  htmlUrl: string;
}

export default function StudioPage() {
  const [repoInput, setRepoInput] = useState("");
  const [pullNumberInput, setPullNumberInput] = useState("");
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingGeneration, setLoadingGeneration] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [generationData, setGenerationData] = useState<GenerationData | null>(null);
  const [reviewState, setReviewState] = useState<"IDLE" | "APPROVED" | "REJECTED">("IDLE");
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);

  const [auth, setAuth] = useState<AuthState>({ authenticated: false });
  
  // Repo & PR Selector States
  const [repos, setRepos] = useState<RepoOption[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [pullRequests, setPullRequests] = useState<PROption[]>([]);
  const [selectedPRNumber, setSelectedPRNumber] = useState<string>("");
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingPulls, setLoadingPulls] = useState(false);
  const [manualInputMode, setManualInputMode] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json: AuthState) => {
        setAuth(json);
        if (json.authenticated || json.authMethod === "LOCAL_DEVELOPMENT_TOKEN") {
          fetchUserRepos();
        }
      })
      .catch(() => setAuth({ authenticated: false }));
  }, []);

  const fetchUserRepos = async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch("/api/github/repos");
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.repos)) {
        setRepos(json.repos);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingRepos(false);
    }
  };

  const fetchPRsForRepo = async (fullName: string) => {
    if (!fullName) {
      setPullRequests([]);
      return;
    }

    setLoadingPulls(true);
    setPullRequests([]);
    setSelectedPRNumber("");

    const [owner, repo] = fullName.split("/");
    try {
      const res = await fetch(`/api/github/pulls?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`);
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.pullRequests)) {
        setPullRequests(json.pullRequests);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingPulls(false);
    }
  };

  const handleSelectRepo = (fullName: string) => {
    setSelectedRepo(fullName);
    setRepoInput(fullName);
    fetchPRsForRepo(fullName);
  };

  const handleSelectPR = (prNumStr: string) => {
    setSelectedPRNumber(prNumStr);
    setPullNumberInput(prNumStr);
    if (selectedRepo && prNumStr) {
      setRepoInput(`https://github.com/${selectedRepo}/pull/${prNumStr}`);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setAuth({ authenticated: false });
      setRepos([]);
      setPullRequests([]);
      setSelectedRepo("");
      setSelectedPRNumber("");
    } catch {
      // Ignore
    }
  };

  // Stage 1: Analyze PR & Detect Drift
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoInput.trim()) {
      setError("Please select or enter a GitHub repository URL or owner/repo format.");
      return;
    }

    setLoadingAnalysis(true);
    setError(null);
    setGenerationError(null);
    setData(null);
    setGenerationData(null);
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
      setLoadingAnalysis(false);
    }
  };

  // Stage 2: Explicitly Generate Documentation Update
  const handleGenerate = async () => {
    if (!data || !data.apiChanges || !data.driftAnalysis) return;

    setLoadingGeneration(true);
    setGenerationError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiChanges: data.apiChanges,
          docContexts: data.docContexts || [],
          driftAnalysis: data.driftAnalysis,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to generate documentation update.");
      }

      setGenerationData(json.generationResult);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setGenerationError(errorObj.message || "An unexpected error occurred during documentation generation.");
    } finally {
      setLoadingGeneration(false);
    }
  };

  // Stage 3: Approve & Sync to GitHub
  const handleSyncToGitHub = async () => {
    if (!data || !data.prMetadata || !generationData) return;

    setSyncing(true);
    setError(null);

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
          filePath: generationData.targetFile,
          content: generationData.generatedContent,
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* Light Mode Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/20">
                ⚡
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition">API-Sync AI</span>
            </Link>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Review Studio
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {auth.authenticated && auth.user ? (
              <div className="flex items-center space-x-3 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-xs text-slate-700 font-medium">@{auth.user.login}</span>
                <span className="text-2xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono font-semibold">Connected</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-slate-500 hover:text-slate-800 transition"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <a
                href="/api/auth/github"
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-medium px-3.5 py-1.5 rounded-lg text-xs transition flex items-center space-x-2"
              >
                <span>Connect GitHub</span>
              </a>
            )}

            <Link
              href="/"
              className="text-xs text-slate-600 hover:text-slate-900 font-medium transition"
            >
              ← Back to Overview
            </Link>
          </div>
        </div>
      </header>

      {/* Main Review Studio Workspace */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">API Documentation Drift Studio</h1>
          <p className="text-sm text-slate-500">
            Select an authorized GitHub repository and open pull request to inspect detected API changes and generated documentation fixes.
          </p>
        </div>

        {/* Input Form & Selection Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          {!manualInputMode && repos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Repo Dropdown */}
              <div className="md:col-span-5">
                <label htmlFor="repoSelect" className="block text-xs font-semibold text-slate-600 mb-1">
                  1. Select Authorized Repository
                </label>
                <select
                  id="repoSelect"
                  value={selectedRepo}
                  onChange={(e) => handleSelectRepo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">-- Choose Repository ({repos.length} available) --</option>
                  {repos.map((r) => (
                    <option key={r.id} value={r.fullName}>
                      {r.fullName} {r.isPrivate ? "(Private)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* PR Dropdown */}
              <div className="md:col-span-5">
                <label htmlFor="prSelect" className="block text-xs font-semibold text-slate-600 mb-1">
                  2. Select Open Pull Request {loadingPulls ? "(Loading...)" : ""}
                </label>
                <select
                  id="prSelect"
                  disabled={!selectedRepo || loadingPulls}
                  value={selectedPRNumber}
                  onChange={(e) => handleSelectPR(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">
                    {!selectedRepo ? "-- Select Repository First --" :
                     pullRequests.length === 0 ? "-- No Open PRs Found --" :
                     `-- Choose Open PR (${pullRequests.length} open) --`}
                  </option>
                  {pullRequests.map((pr) => (
                    <option key={pr.number} value={pr.number}>
                      #{pr.number}: {pr.title} (@{pr.author})
                    </option>
                  ))}
                </select>
              </div>

              {/* Analyze Button */}
              <div className="md:col-span-2 flex items-end">
                <button
                  onClick={handleAnalyze}
                  disabled={!repoInput || loadingAnalysis || loadingGeneration || syncing}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold py-3 px-4 rounded-xl transition text-sm flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/10"
                >
                  {loadingAnalysis ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <span>Analyze Drift</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Manual Input Mode Form */
            <form onSubmit={handleAnalyze} className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8">
                <label htmlFor="repoInput" className="block text-xs font-semibold text-slate-600 mb-1">
                  GitHub Repository or PR URL
                </label>
                <input
                  id="repoInput"
                  type="text"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  placeholder="https://github.com/owner/repo/pull/1 or owner/repo"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="pullNumberInput" className="block text-xs font-semibold text-slate-600 mb-1">
                  PR # (Optional)
                </label>
                <input
                  id="pullNumberInput"
                  type="number"
                  value={pullNumberInput}
                  onChange={(e) => setPullNumberInput(e.target.value)}
                  placeholder="1"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="md:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={loadingAnalysis || loadingGeneration || syncing}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold py-3 px-4 rounded-xl transition text-sm flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/10"
                >
                  {loadingAnalysis ? (
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
          )}

          {/* Selector / Manual Mode Toggle */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>
              {loadingRepos ? "Loading authorized repositories..." :
               repos.length > 0 && !manualInputMode ? `Loaded ${repos.length} repository options` :
               "Direct PR URL mode"}
            </span>
            <button
              onClick={() => setManualInputMode(!manualInputMode)}
              className="text-indigo-600 hover:text-indigo-800 font-medium font-mono text-xs"
            >
              {manualInputMode ? "Switch to Repository Selector" : "Switch to Direct URL Input"}
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Stage 1 Results Area */}
        {data && (
          <div className="space-y-8 animate-fadeIn">
            {/* PR Summary Bar */}
            {data.prMetadata && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      PR #{data.prMetadata.number}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">{data.prMetadata.title}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Author: <span className="text-slate-800 font-medium">@{data.prMetadata.author.login}</span> • Branch: <span className="font-mono text-slate-800">{data.prMetadata.head.ref}</span> → <span className="font-mono text-slate-800">{data.prMetadata.base.ref}</span>
                  </p>
                </div>

                {data.summary && (
                  <div className="flex items-center space-x-4 text-xs font-mono font-semibold">
                    <span className="text-emerald-600">+{data.summary.additions}</span>
                    <span className="text-rose-600">-{data.summary.deletions}</span>
                    <span className="text-slate-500">{data.summary.changedFilesCount} files changed</span>
                  </div>
                )}
              </div>
            )}

            {/* Detected API Changes Panel */}
            {data.apiChanges && data.apiChanges.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  Detected API Code Changes ({data.apiChanges.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.apiChanges.map((change, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded font-mono ${
                          change.method === "GET" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                          change.method === "POST" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                          change.method === "PUT" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                          "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}>
                          {change.method}
                        </span>
                        <span className="font-mono text-sm text-slate-800 font-medium">{change.path}</span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">{change.changeType}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Drift Status Banner & Reasoning Card */}
            {data.driftAnalysis && (
              <div className={`border rounded-xl p-6 shadow-sm ${
                data.driftAnalysis.status === "CONFIRMED_DRIFT" ? "bg-rose-50/50 border-rose-200" :
                data.driftAnalysis.status === "NO_DRIFT" ? "bg-emerald-50/50 border-emerald-200" :
                "bg-amber-50/50 border-amber-200"
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center space-x-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      data.driftAnalysis.status === "CONFIRMED_DRIFT" ? "bg-rose-100 text-rose-800 border border-rose-300" :
                      data.driftAnalysis.status === "NO_DRIFT" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                      "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}>
                      {data.driftAnalysis.status.replace("_", " ")}
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      Severity: <span className="text-slate-900 font-bold">{data.driftAnalysis.severity}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono text-slate-500">
                    {data.driftAnalysis.modelMetadata && (
                      <span>
                        AI Model: <span className="text-indigo-700 font-semibold">{data.driftAnalysis.modelMetadata.modelUsed}</span>
                        {data.driftAnalysis.modelMetadata.fallbackUsed && (
                          <span className="ml-1 text-amber-600 font-semibold">(Fallback)</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2">{data.driftAnalysis.summary}</h3>
                <p className="text-sm text-slate-700 leading-relaxed mb-6">{data.driftAnalysis.explanation}</p>

                {data.driftAnalysis.missingInformation.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-rose-800 uppercase tracking-wider mb-2">Missing Information in Docs:</h4>
                    <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                      {data.driftAnalysis.missingInformation.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Stage 2 Action: Generate Documentation Update */}
                {data.driftAnalysis.status === "CONFIRMED_DRIFT" && !generationData && (
                  <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-4">
                    <div className="text-xs text-slate-700">
                      Documentation drift is confirmed. Generate a formatted Markdown update using SkillPatch.
                    </div>
                    <button
                      onClick={handleGenerate}
                      disabled={loadingGeneration}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium py-2 px-5 rounded-lg text-xs transition flex items-center space-x-2 shadow-md shadow-indigo-600/10"
                    >
                      {loadingGeneration ? (
                        <>
                          <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                          <span>Generating Update...</span>
                        </>
                      ) : (
                        <span>Generate Documentation Update</span>
                      )}
                    </button>
                  </div>
                )}

                {data.driftAnalysis.status === "UNCERTAIN" && (
                  <div className="mt-4 p-3 rounded bg-amber-100 border border-amber-200 text-amber-900 text-xs">
                    ⚠️ Drift evidence is uncertain. Verify available source snippets before generating updates.
                  </div>
                )}
              </div>
            )}

            {generationError && (
              <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                ⚠️ Generation Error: {generationError}
              </div>
            )}

            {/* Stage 2 Result: Side-by-Side Documentation Studio */}
            {generationData && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-fadeIn">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Side-by-Side Documentation Studio
                  </h3>
                  <div className="flex items-center space-x-3 text-xs font-mono">
                    {generationData.modelMetadata && (
                      <span className="text-slate-500">
                        Model: <span className="text-indigo-700 font-semibold">{generationData.modelMetadata.modelUsed}</span>
                      </span>
                    )}
                    <span className="text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200 font-semibold">
                      SkillPatch: api-documentation
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Existing Doc */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col h-96">
                    <div className="text-xs font-bold text-slate-600 border-b border-slate-200 pb-2 mb-3 flex items-center justify-between">
                      <span>Current Repository Documentation Snippet</span>
                      <span className="text-slate-500 font-mono">
                        {data.docContexts?.[0]?.matchedFile || "README.md"}
                      </span>
                    </div>
                    <pre className="text-xs text-slate-800 font-mono overflow-auto flex-1 p-3 bg-white border border-slate-200 rounded whitespace-pre-wrap leading-relaxed">
                      {data.docContexts?.[0]?.matchedSections?.[0]?.contentSnippet || "No existing matching section found in repository."}
                    </pre>
                  </div>

                  {/* Right: SkillPatch Proposal */}
                  <div className="bg-slate-50 border border-indigo-200 rounded-lg p-4 flex flex-col h-96">
                    <div className="text-xs font-bold text-indigo-700 border-b border-slate-200 pb-2 mb-3 flex items-center justify-between">
                      <span>Proposed Documentation Update (SkillPatch)</span>
                      <span className="text-indigo-700 font-mono font-semibold">
                        {generationData.targetFile}
                      </span>
                    </div>
                    <pre className="text-xs text-slate-900 font-mono overflow-auto flex-1 p-3 bg-emerald-50/50 border border-emerald-200 rounded whitespace-pre-wrap leading-relaxed">
                      {generationData.generatedContent}
                    </pre>
                  </div>
                </div>

                {/* Stage 3 Action: Approve & Sync */}
                <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-600">
                    {syncResult?.status === "SYNCED" && (
                      <div className="text-emerald-700 font-semibold space-y-1">
                        <div>✓ Successfully synchronized to branch <span className="font-mono">{syncResult.branch}</span>!</div>
                        {syncResult.commitSha && (
                          <div className="text-xs text-slate-500 font-mono">
                            Commit:{" "}
                            {syncResult.commitUrl ? (
                              <a
                                href={syncResult.commitUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="underline text-indigo-600 hover:text-indigo-800 font-semibold"
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
                      <span className="text-amber-800 font-semibold">
                        ⚠️ Documentation changed on GitHub. Please re-analyze before syncing.
                      </span>
                    )}
                    {reviewState === "REJECTED" && (
                      <span className="text-rose-700 font-semibold">
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
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
                    >
                      Reject
                    </button>
                    <button
                      onClick={handleSyncToGitHub}
                      disabled={syncing || syncResult?.status === "SYNCED"}
                      className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white transition flex items-center space-x-2 shadow-md shadow-emerald-600/10"
                    >
                      {syncing ? (
                        <>
                          <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                          <span>Syncing to GitHub...</span>
                        </>
                      ) : syncResult?.status === "SYNCED" ? (
                        <span>Synced to GitHub ✓</span>
                      ) : (
                        <span>Approve &amp; Sync to GitHub</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

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
