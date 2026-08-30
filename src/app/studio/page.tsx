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
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
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

  const handleConnectGitHub = () => {
    setIsConnecting(true);
    window.location.href = "/api/auth/github";
  };

  const handleLogout = async () => {
    setIsDisconnecting(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setAuth({ authenticated: false });
      setRepos([]);
      setPullRequests([]);
      setSelectedRepo("");
      setSelectedPRNumber("");
    } catch {
      // Ignore
    } finally {
      setIsDisconnecting(false);
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
    <div className="min-h-screen bg-[#f6f5f2] text-[#141413] flex flex-col font-sans antialiased selection:bg-[#ff6b00]/15 selection:text-[#ea580c]">
      {/* Light Mode Studio Header */}
      <header className="border-b border-[#e6e4df] bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="h-7 w-7 rounded-lg bg-[#0f0f0e] text-white flex items-center justify-center font-mono font-bold text-xs shadow-sm">
                a/s
              </div>
              <span className="text-lg font-bold tracking-tight text-[#141413] font-mono group-hover:text-[#ea580c] transition-colors">api-sync</span>
            </Link>
            <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded bg-[#f1efea] text-[#66645e] border border-[#e5e3dc]">
              Review Workbench
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {auth.authenticated && auth.user ? (
              <div className="flex items-center space-x-3 bg-[#f1efea] border border-[#e5e3dc] px-3 py-1 rounded-xl">
                <span className="text-xs text-[#141413] font-mono font-medium">@{auth.user.login}</span>
                <span className="text-2xs text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded font-mono font-bold">Authorized</span>
                <button
                  onClick={handleLogout}
                  disabled={isDisconnecting}
                  className="text-xs text-[#66645e] hover:text-[#141413] transition-all duration-200 disabled:opacity-60 flex items-center space-x-1.5"
                >
                  {isDisconnecting ? (
                    <>
                      <svg className="animate-spin h-3 w-3 text-[#66645e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Disconnecting...</span>
                    </>
                  ) : (
                    <span>Disconnect</span>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectGitHub}
                disabled={isConnecting}
                className={`bg-[#f1efea] hover:bg-[#e8e5de] text-[#141413] border border-[#e5e3dc] font-semibold px-3 py-1.5 rounded-xl text-xs transition-all duration-200 flex items-center space-x-1.5 ${
                  isConnecting ? "opacity-80 cursor-wait" : ""
                }`}
              >
                {isConnecting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-[#141413]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>Connect GitHub</span>
                )}
              </button>
            )}

            <Link
              href="/"
              className="text-xs text-[#66645e] hover:text-[#141413] font-medium transition"
            >
              ← Overview
            </Link>
          </div>
        </div>
      </header>

      {/* Main Review Studio Workspace */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 text-2xs font-mono font-bold text-[#ea580c] uppercase tracking-wider bg-[#fff7ed] px-2.5 py-0.5 rounded border border-[#ffedd5]">
            <span>Deterministic Review Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141413] tracking-tight">API Drift Workbench</h1>
          <p className="text-xs sm:text-sm text-[#66645e]">
            Select an authorized GitHub repository and open pull request to inspect detected route changes and generated SkillPatch fixes.
          </p>
        </div>

        {/* Input Form & Selection Card */}
        <div className="bg-white border border-[#e6e4df] rounded-2xl p-6 shadow-[0_4px_16px_-4px_rgba(20,20,20,0.04)] space-y-6">
          {!manualInputMode && repos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Repo Dropdown */}
              <div className="md:col-span-5">
                <label htmlFor="repoSelect" className="block text-xs font-bold font-mono text-[#66645e] mb-1.5 uppercase tracking-wider">
                  1. Authorized Repository
                </label>
                <select
                  id="repoSelect"
                  value={selectedRepo}
                  onChange={(e) => handleSelectRepo(e.target.value)}
                  className="w-full bg-[#faf9f6] border border-[#e5e3dc] rounded-xl px-4 py-2.5 text-xs text-[#141413] font-mono focus:outline-none focus:ring-2 focus:ring-[#0f0f0e]"
                >
                  <option value="">-- Select Repository ({repos.length} available) --</option>
                  {repos.map((r) => (
                    <option key={r.id} value={r.fullName}>
                      {r.fullName} {r.isPrivate ? "(Private)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* PR Dropdown */}
              <div className="md:col-span-5">
                <label htmlFor="prSelect" className="block text-xs font-bold font-mono text-[#66645e] mb-1.5 uppercase tracking-wider">
                  2. Open Pull Request {loadingPulls ? "(Loading...)" : ""}
                </label>
                <select
                  id="prSelect"
                  disabled={!selectedRepo || loadingPulls}
                  value={selectedPRNumber}
                  onChange={(e) => handleSelectPR(e.target.value)}
                  className="w-full bg-[#faf9f6] border border-[#e5e3dc] rounded-xl px-4 py-2.5 text-xs text-[#141413] font-mono disabled:bg-[#f1efea] disabled:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0f0f0e]"
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
                  className="w-full bg-[#0f0f0e] hover:bg-[#262624] disabled:bg-neutral-300 text-white font-semibold py-2.5 px-4 rounded-xl transition text-xs flex items-center justify-center space-x-2 shadow-sm font-mono"
                >
                  {loadingAnalysis ? (
                    <>
                      <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
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
                <label htmlFor="repoInput" className="block text-xs font-bold font-mono text-[#66645e] mb-1.5 uppercase tracking-wider">
                  GitHub Repository or PR URL
                </label>
                <input
                  id="repoInput"
                  type="text"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  placeholder="https://github.com/owner/repo/pull/1 or owner/repo"
                  className="w-full bg-[#faf9f6] border border-[#e5e3dc] rounded-xl px-4 py-2.5 text-xs text-[#141413] font-mono placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0f0f0e]"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="pullNumberInput" className="block text-xs font-bold font-mono text-[#66645e] mb-1.5 uppercase tracking-wider">
                  PR # (Optional)
                </label>
                <input
                  id="pullNumberInput"
                  type="number"
                  value={pullNumberInput}
                  onChange={(e) => setPullNumberInput(e.target.value)}
                  placeholder="1"
                  className="w-full bg-[#faf9f6] border border-[#e5e3dc] rounded-xl px-4 py-2.5 text-xs text-[#141413] font-mono placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0f0f0e]"
                />
              </div>

              <div className="md:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={loadingAnalysis || loadingGeneration || syncing}
                  className="w-full bg-[#0f0f0e] hover:bg-[#262624] disabled:bg-neutral-300 text-white font-semibold py-2.5 px-4 rounded-xl transition text-xs flex items-center justify-center space-x-2 shadow-sm font-mono"
                >
                  {loadingAnalysis ? (
                    <>
                      <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
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
          <div className="flex items-center justify-between text-2xs text-[#66645e] pt-2 border-t border-[#f1efea]">
            <span>
              {loadingRepos ? "Loading authorized repositories..." :
               repos.length > 0 && !manualInputMode ? `Loaded ${repos.length} repository options` :
               "Direct PR URL mode"}
            </span>
            <button
              onClick={() => setManualInputMode(!manualInputMode)}
              className="text-[#ea580c] hover:underline font-mono font-semibold"
            >
              {manualInputMode ? "Switch to Repository Selector" : "Switch to Direct URL Input"}
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Stage 1 Results Area */}
        {data && (
          <div className="space-y-8 animate-fadeIn">
            {/* PR Summary Bar */}
            {data.prMetadata && (
              <div className="bg-white border border-[#e6e4df] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded bg-[#f1efea] text-[#141413] border border-[#e5e3dc]">
                      PR #{data.prMetadata.number}
                    </span>
                    <h3 className="text-base font-bold text-[#141413]">{data.prMetadata.title}</h3>
                  </div>
                  <p className="text-xs text-[#66645e] mt-1 font-mono">
                    Author: <span className="text-[#141413] font-bold">@{data.prMetadata.author.login}</span> • Branch: <span className="text-[#141413]">{data.prMetadata.head.ref}</span> → <span className="text-[#141413]">{data.prMetadata.base.ref}</span>
                  </p>
                </div>

                {data.summary && (
                  <div className="flex items-center space-x-4 text-xs font-mono font-semibold">
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">+{data.summary.additions}</span>
                    <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">-{data.summary.deletions}</span>
                    <span className="text-[#66645e]">{data.summary.changedFilesCount} files changed</span>
                  </div>
                )}
              </div>
            )}

            {/* Detected API Changes Panel */}
            {data.apiChanges && data.apiChanges.length > 0 && (
              <div className="bg-white border border-[#e6e4df] rounded-2xl p-6 shadow-2xs">
                <h3 className="text-xs font-bold font-mono text-[#66645e] uppercase tracking-wider mb-4">
                  Detected API Code Changes ({data.apiChanges.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.apiChanges.map((change, idx) => (
                    <div key={idx} className="bg-[#faf9f6] border border-[#e5e3dc] rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className={`text-2xs font-bold px-2 py-0.5 rounded font-mono ${
                          change.method === "GET" ? "bg-emerald-100 text-emerald-900 border border-emerald-200" :
                          change.method === "POST" ? "bg-blue-100 text-blue-900 border border-blue-200" :
                          change.method === "PUT" ? "bg-amber-100 text-amber-900 border border-amber-200" :
                          "bg-rose-100 text-rose-900 border border-rose-200"
                        }`}>
                          {change.method}
                        </span>
                        <span className="font-mono text-xs font-bold text-[#141413]">{change.path}</span>
                      </div>
                      <span className="text-2xs text-[#66645e] font-mono">{change.changeType}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Drift Status Banner & Reasoning Card */}
            {data.driftAnalysis && (
              <div className={`border rounded-2xl p-6 shadow-2xs ${
                data.driftAnalysis.status === "CONFIRMED_DRIFT" ? "bg-[#fef2f2] border-rose-200" :
                data.driftAnalysis.status === "NO_DRIFT" ? "bg-[#f0fdf4] border-emerald-200" :
                "bg-[#fff7ed] border-amber-200"
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center space-x-3">
                    <span className={`text-2xs font-bold px-3 py-1 rounded-full uppercase tracking-wider font-mono ${
                      data.driftAnalysis.status === "CONFIRMED_DRIFT" ? "bg-rose-100 text-rose-900 border border-rose-300" :
                      data.driftAnalysis.status === "NO_DRIFT" ? "bg-emerald-100 text-emerald-900 border border-emerald-300" :
                      "bg-amber-100 text-amber-900 border border-amber-300"
                    }`}>
                      {data.driftAnalysis.status.replace("_", " ")}
                    </span>
                    <span className="text-xs font-semibold text-[#66645e]">
                      Severity: <span className="text-[#141413] font-bold">{data.driftAnalysis.severity}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono text-[#66645e]">
                    {data.driftAnalysis.modelMetadata && (
                      <span>
                        AI Model: <span className="text-[#141413] font-bold">{data.driftAnalysis.modelMetadata.modelUsed}</span>
                        {data.driftAnalysis.modelMetadata.fallbackUsed && (
                          <span className="ml-1 text-[#ea580c] font-bold">(Fallback)</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[#141413] mb-2">{data.driftAnalysis.summary}</h3>
                <p className="text-xs sm:text-sm text-[#141413] leading-relaxed mb-5">{data.driftAnalysis.explanation}</p>

                {data.driftAnalysis.missingInformation.length > 0 && (
                  <div className="mb-4 bg-white/60 p-3.5 rounded-xl border border-rose-200/80">
                    <h4 className="text-2xs font-bold text-rose-800 uppercase tracking-wider mb-2 font-mono">Missing Information in Docs:</h4>
                    <ul className="list-disc list-inside text-xs text-[#141413] space-y-1">
                      {data.driftAnalysis.missingInformation.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Stage 2 Action: Generate Documentation Update */}
                {data.driftAnalysis.status === "CONFIRMED_DRIFT" && !generationData && (
                  <div className="mt-6 pt-4 border-t border-rose-200/60 flex items-center justify-between flex-wrap gap-4">
                    <div className="text-xs text-[#141413]">
                      Documentation drift confirmed. Click to generate a formatted Markdown update using SkillPatch.
                    </div>
                    <button
                      onClick={handleGenerate}
                      disabled={loadingGeneration}
                      className="bg-[#0f0f0e] hover:bg-[#262624] disabled:bg-neutral-300 text-white font-semibold py-2 px-5 rounded-xl text-xs transition flex items-center space-x-2 shadow-sm font-mono"
                    >
                      {loadingGeneration ? (
                        <>
                          <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                          <span>Generating Update...</span>
                        </>
                      ) : (
                        <span>Generate Documentation Update →</span>
                      )}
                    </button>
                  </div>
                )}

                {data.driftAnalysis.status === "UNCERTAIN" && (
                  <div className="mt-4 p-3 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-900 text-xs">
                    ⚠️ Drift evidence is uncertain. Verify available source snippets before generating updates.
                  </div>
                )}
              </div>
            )}

            {generationError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono">
                ⚠️ Generation Error: {generationError}
              </div>
            )}

            {/* Stage 2 Result: Side-by-Side Documentation Studio */}
            {generationData && (
              <div className="bg-white border border-[#e6e4df] rounded-2xl p-6 shadow-2xs animate-fadeIn">
                <div className="flex items-center justify-between mb-5 border-b border-[#f1efea] pb-3">
                  <h3 className="text-xs font-bold font-mono text-[#66645e] uppercase tracking-wider">
                    Side-by-Side Documentation Studio
                  </h3>
                  <div className="flex items-center space-x-3 text-2xs font-mono">
                    {generationData.modelMetadata && (
                      <span className="text-[#66645e]">
                        Model: <span className="text-[#141413] font-bold">{generationData.modelMetadata.modelUsed}</span>
                      </span>
                    )}
                    <span className="text-[#ea580c] bg-[#fff7ed] px-2 py-0.5 rounded border border-[#ffedd5] font-bold">
                      SkillPatch: api-documentation
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Existing Doc */}
                  <div className="bg-[#faf9f6] border border-[#e5e3dc] rounded-xl p-4 flex flex-col h-96">
                    <div className="text-xs font-bold text-[#66645e] border-b border-[#e5e3dc] pb-2 mb-3 flex items-center justify-between font-mono">
                      <span>Current Documentation Snippet</span>
                      <span className="text-[#141413]">
                        {data.docContexts?.[0]?.matchedFile || "README.md"}
                      </span>
                    </div>
                    <pre className="text-2xs text-[#141413] font-mono overflow-auto flex-1 p-3 bg-white border border-[#e5e3dc] rounded-lg whitespace-pre-wrap leading-relaxed">
                      {data.docContexts?.[0]?.matchedSections?.[0]?.contentSnippet || "No existing matching section found in repository."}
                    </pre>
                  </div>

                  {/* Right: SkillPatch Proposal */}
                  <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 flex flex-col h-96">
                    <div className="text-xs font-bold text-emerald-900 border-b border-[#bbf7d0] pb-2 mb-3 flex items-center justify-between font-mono">
                      <span>Proposed SkillPatch Update</span>
                      <span className="text-emerald-900 font-bold">
                        {generationData.targetFile}
                      </span>
                    </div>
                    <pre className="text-2xs text-emerald-950 font-mono overflow-auto flex-1 p-3 bg-white border border-[#bbf7d0] rounded-lg whitespace-pre-wrap leading-relaxed">
                      {generationData.generatedContent}
                    </pre>
                  </div>
                </div>

                {/* Stage 3 Action: Approve & Sync */}
                <div className="mt-8 pt-6 border-t border-[#f1efea] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-[#66645e]">
                    {syncResult?.status === "SYNCED" && (
                      <div className="text-emerald-800 font-semibold space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <span>✓ Successfully synchronized to branch</span>
                          <span className="font-mono bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded text-2xs">
                            {syncResult.branch}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-2xs font-mono text-[#66645e]">
                          {syncResult.commitSha && (
                            <span>
                              Commit:{" "}
                              {syncResult.commitUrl ? (
                                <a
                                  href={syncResult.commitUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline text-[#ea580c] font-bold hover:text-[#c2410c]"
                                >
                                  {syncResult.commitSha.substring(0, 7)}
                                </a>
                              ) : (
                                syncResult.commitSha.substring(0, 7)
                              )}
                            </span>
                          )}
                          {data?.prMetadata?.htmlUrl && (
                            <>
                              <span>•</span>
                              <a
                                href={data.prMetadata.htmlUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-800 font-bold underline hover:text-emerald-950 inline-flex items-center gap-1"
                              >
                                <span>View PR #{data.prMetadata.number} on GitHub</span>
                                <span>↗</span>
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {syncResult?.status === "CONFLICT" && (
                      <span className="text-amber-800 font-semibold">
                        ⚠️ Documentation changed on GitHub. Please re-analyze before syncing.
                      </span>
                    )}
                    {syncResult?.status === "UNAUTHORIZED" && (
                      <div className="text-rose-800 font-semibold space-y-1">
                        <div>{syncResult.message}</div>
                        <div className="text-2xs text-slate-600 font-normal">
                          Click <a href="/api/auth/github" className="text-indigo-600 underline font-semibold">Connect GitHub</a> in the header to authorize repository write access.
                        </div>
                      </div>
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
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#f1efea] hover:bg-[#e8e5de] text-[#141413] border border-[#e5e3dc] transition"
                    >
                      Reject
                    </button>
                    <button
                      onClick={handleSyncToGitHub}
                      disabled={syncing || syncResult?.status === "SYNCED"}
                      className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 disabled:bg-neutral-300 text-white transition flex items-center space-x-2 shadow-sm font-mono"
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
