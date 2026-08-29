import { Octokit } from "@octokit/rest";
import {
  FetchPullRequestInput,
  GitHubServiceError,
  NormalizedPullRequestData,
  PRFileChange,
  PRMetadata,
} from "./types";

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
