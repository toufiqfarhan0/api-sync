import { Octokit } from "@octokit/rest";
import {
  DocumentationSyncResult,
  FetchPullRequestInput,
  GitHubServiceError,
  NormalizedPullRequestData,
  OpenPRSummary,
  PRFileChange,
  PRMetadata,
  SyncDocumentationInput,
  UserRepoSummary,
} from "./types";

/**
 * Creates an Octokit instance using credential priority:
 * 1. User session access token (passed explicitly via `token` parameter)
 * 2. `process.env.GITHUB_TOKEN` (local development fallback)
 */
export function createOctokitClient(token?: string): Octokit {
  const authToken = token || process.env.GITHUB_TOKEN;
  return new Octokit({
    auth: authToken || undefined,
  });
}

export function normalizePRMetadata(data: Record<string, unknown>): PRMetadata {
  const user = (data.user || {}) as Record<string, unknown>;
  const head = (data.head || {}) as Record<string, unknown>;
  const base = (data.base || {}) as Record<string, unknown>;

  return {
    id: (data.id as number) || 0,
    number: (data.number as number) || 0,
    title: (data.title as string) || "",
    body: (data.body as string) || null,
    state: data.state === "closed" ? "closed" : "open",
    htmlUrl: (data.html_url as string) || "",
    createdAt: (data.created_at as string) || "",
    updatedAt: (data.updated_at as string) || "",
    closedAt: (data.closed_at as string) || null,
    mergedAt: (data.merged_at as string) || null,
    author: {
      login: (user.login as string) || "unknown",
      avatarUrl: (user.avatar_url as string) || "",
    },
    head: {
      label: (head.label as string) || "",
      ref: (head.ref as string) || "",
      sha: (head.sha as string) || "",
    },
    base: {
      label: (base.label as string) || "",
      ref: (base.ref as string) || "",
      sha: (base.sha as string) || "",
    },
  };
}

export function normalizePRFiles(filesData: Record<string, unknown>[]): PRFileChange[] {
  if (!Array.isArray(filesData)) return [];

  return filesData.map((file) => ({
    filename: (file.filename as string) || "",
    previousFilename: (file.previous_filename as string) || undefined,
    status: (file.status as PRFileChange["status"]) || "unknown",
    additions: (file.additions as number) || 0,
    deletions: (file.deletions as number) || 0,
    changes: (file.changes as number) || 0,
    patch: (file.patch as string) || undefined,
    rawUrl: (file.raw_url as string) || undefined,
  }));
}

export async function fetchPullRequestData(
  input: FetchPullRequestInput,
  customOctokit?: Octokit
): Promise<NormalizedPullRequestData> {
  const { owner, repo, pullNumber, token } = input;

  if (!owner || typeof owner !== "string" || !owner.trim()) {
    throw new GitHubServiceError("Owner is required and must be a non-empty string.", "INVALID_INPUT");
  }

  if (!repo || typeof repo !== "string" || !repo.trim()) {
    throw new GitHubServiceError("Repository name is required and must be a non-empty string.", "INVALID_INPUT");
  }

  if (!pullNumber || typeof pullNumber !== "number" || pullNumber <= 0 || !Number.isInteger(pullNumber)) {
    throw new GitHubServiceError("Pull Request number must be a positive integer.", "INVALID_INPUT");
  }

  const client = customOctokit || createOctokitClient(token);

  try {
    const [prResponse, filesResponse] = await Promise.all([
      client.rest.pulls.get({
        owner: owner.trim(),
        repo: repo.trim(),
        pull_number: pullNumber,
      }),
      client.rest.pulls.listFiles({
        owner: owner.trim(),
        repo: repo.trim(),
        pull_number: pullNumber,
        per_page: 100,
      }),
    ]);

    const metadata = normalizePRMetadata(prResponse.data as unknown as Record<string, unknown>);
    const files = normalizePRFiles(filesResponse.data as unknown as Record<string, unknown>[]);

    const additions = files.reduce((acc, f) => acc + f.additions, 0);
    const deletions = files.reduce((acc, f) => acc + f.deletions, 0);

    return {
      owner: owner.trim(),
      repo: repo.trim(),
      pullNumber,
      metadata,
      files,
      totalFilesChanged: files.length,
      summary: {
        additions,
        deletions,
        changedFilesCount: files.length,
      },
    };
  } catch (error: unknown) {
    if (error instanceof GitHubServiceError) {
      throw error;
    }

    const errObj = (error || {}) as { status?: number; statusCode?: number; message?: string };
    const status = errObj.status || errObj.statusCode;

    if (status === 404) {
      throw new GitHubServiceError(
        `Pull Request #${pullNumber} not found in ${owner}/${repo}.`,
        "NOT_FOUND",
        404
      );
    }

    if (status === 401 || status === 403) {
      if (errObj.message && errObj.message.includes("rate limit")) {
        throw new GitHubServiceError("GitHub API rate limit exceeded.", "RATE_LIMITED", 403);
      }
      throw new GitHubServiceError(
        "Unauthorized access to GitHub repository. Check your GITHUB_TOKEN.",
        "UNAUTHORIZED",
        status
      );
    }

    throw new GitHubServiceError(
      errObj.message || "An unexpected error occurred while fetching GitHub PR data.",
      "API_ERROR",
      status
    );
  }
}

export async function commitDocumentationFile(
  input: SyncDocumentationInput,
  customOctokit?: Octokit
): Promise<DocumentationSyncResult> {
  const { owner, repo, pullNumber, filePath, content, commitMessage, token, expectedSha } = input;

  if (!owner || !repo || !pullNumber || !filePath || !content) {
    return {
      success: false,
      repository: `${owner}/${repo}`,
      branch: "unknown",
      filePath: filePath || "unknown",
      status: "FAILED",
      message: "Missing required input parameters for documentation synchronization.",
    };
  }

  // Prevent path traversal
  const normalizedPath = filePath.replace(/^(\.\/|\/)+/, "");
  if (normalizedPath.includes("..")) {
    return {
      success: false,
      repository: `${owner}/${repo}`,
      branch: "unknown",
      filePath: normalizedPath,
      status: "FAILED",
      message: "Invalid file path: path traversal is prohibited.",
    };
  }

  const client = customOctokit || createOctokitClient(token);

  try {
    // 1. Fetch PR metadata to identify exact target head branch
    const prResponse = await client.rest.pulls.get({
      owner: owner.trim(),
      repo: repo.trim(),
      pull_number: pullNumber,
    });

    const targetBranch = prResponse.data.head.ref;
    if (!targetBranch) {
      return {
        success: false,
        repository: `${owner}/${repo}`,
        branch: "unknown",
        filePath: normalizedPath,
        status: "FAILED",
        message: "Could not resolve PR head branch.",
      };
    }

    // 2. Fetch current file SHA on target branch if it exists
    let fileSha: string | undefined;
    try {
      const fileRes = await client.rest.repos.getContent({
        owner: owner.trim(),
        repo: repo.trim(),
        path: normalizedPath,
        ref: targetBranch,
      });

      if (!Array.isArray(fileRes.data) && "sha" in fileRes.data) {
        fileSha = fileRes.data.sha;
      }
    } catch {
      // File does not exist yet (will be created)
    }

    // 3. Concurrency / Stale SHA check
    if (expectedSha && fileSha && expectedSha !== fileSha) {
      return {
        success: false,
        repository: `${owner}/${repo}`,
        branch: targetBranch,
        filePath: normalizedPath,
        status: "CONFLICT",
        message: "Documentation file has been modified on GitHub since analysis. Please re-analyze before syncing.",
      };
    }

    // 4. Commit updated content directly to PR head branch
    const base64Content = Buffer.from(content, "utf-8").toString("base64");
    const defaultMsg = `docs: sync API documentation for PR #${pullNumber} [API-Sync AI]`;

    const commitRes = await client.rest.repos.createOrUpdateFileContents({
      owner: owner.trim(),
      repo: repo.trim(),
      path: normalizedPath,
      message: commitMessage || defaultMsg,
      content: base64Content,
      sha: fileSha,
      branch: targetBranch,
    });

    const commitSha = commitRes.data.commit.sha;
    const commitUrl = commitRes.data.commit.html_url;

    return {
      success: true,
      repository: `${owner}/${repo}`,
      branch: targetBranch,
      filePath: normalizedPath,
      commitSha,
      commitUrl,
      status: "SYNCED",
      message: `Successfully synchronized documentation to branch '${targetBranch}'.`,
    };
  } catch (error: unknown) {
    const errObj = (error || {}) as { status?: number; statusCode?: number; message?: string };
    const status = errObj.status || errObj.statusCode;

    if (status === 409) {
      return {
        success: false,
        repository: `${owner}/${repo}`,
        branch: "unknown",
        filePath: normalizedPath,
        status: "CONFLICT",
        message: "GitHub conflict: file SHA mismatch or concurrent modification detected.",
      };
    }

    if (status === 401 || status === 403) {
      return {
        success: false,
        repository: `${owner}/${repo}`,
        branch: "unknown",
        filePath: normalizedPath,
        status: "UNAUTHORIZED",
        message: "GitHub authorization failed: Write permissions required to commit to this repository. Please connect your GitHub account with write access or verify repository permissions.",
      };
    }

    if (status === 404) {
      return {
        success: false,
        repository: `${owner}/${repo}`,
        branch: "unknown",
        filePath: normalizedPath,
        status: "NOT_FOUND",
        message: `Repository ${owner}/${repo} or PR #${pullNumber} not found on GitHub.`,
      };
    }

    return {
      success: false,
      repository: `${owner}/${repo}`,
      branch: "unknown",
      filePath: normalizedPath,
      status: "FAILED",
      message: errObj.message || "Failed to commit documentation update to GitHub.",
    };
  }
}

export async function listUserRepositories(token?: string, customOctokit?: Octokit): Promise<UserRepoSummary[]> {
  const client = customOctokit || createOctokitClient(token);

  try {
    const res = await client.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 50,
      type: "all",
    });

    return res.data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner?.login || "unknown",
      defaultBranch: repo.default_branch || "main",
      isPrivate: repo.private || false,
      description: repo.description || null,
      htmlUrl: repo.html_url,
    }));
  } catch {
    // If listing authenticated repos fails (e.g. scope limit), fallback to public repos
    try {
      const publicRes = await client.rest.repos.listPublic({ per_page: 20 });
      return publicRes.data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner?.login || "unknown",
        defaultBranch: repo.default_branch || "main",
        isPrivate: repo.private || false,
        description: repo.description || null,
        htmlUrl: repo.html_url,
      }));
    } catch (err: unknown) {
      const error = err as { message?: string };
      throw new GitHubServiceError(`Failed to fetch repositories: ${error.message || "Unknown error"}`, "API_ERROR");
    }
  }
}

export async function listOpenPullRequests(
  owner: string,
  repo: string,
  token?: string,
  customOctokit?: Octokit
): Promise<OpenPRSummary[]> {
  if (!owner || !repo) {
    throw new GitHubServiceError("Owner and repository name are required.", "INVALID_INPUT");
  }

  const client = customOctokit || createOctokitClient(token);

  try {
    const res = await client.rest.pulls.list({
      owner: owner.trim(),
      repo: repo.trim(),
      state: "open",
      per_page: 30,
    });

    return res.data.map((pr) => ({
      number: pr.number,
      title: pr.title || "",
      author: pr.user?.login || "unknown",
      headRef: pr.head?.ref || "",
      baseRef: pr.base?.ref || "",
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      isDraft: pr.draft || false,
      htmlUrl: pr.html_url,
    }));
  } catch (err: unknown) {
    const error = err as { message?: string };
    throw new GitHubServiceError(
      `Failed to fetch open pull requests for ${owner}/${repo}: ${error.message || "Unknown error"}`,
      "API_ERROR"
    );
  }
}
