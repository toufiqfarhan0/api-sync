export interface FetchPullRequestInput {
  owner: string;
  repo: string;
  pullNumber: number;
  token?: string;
}

export interface PRFileChange {
  filename: string;
  previousFilename?: string;
  status: "added" | "modified" | "removed" | "renamed" | "copied" | "changed" | "unchanged" | "unknown";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  rawUrl?: string;
}

export interface PRMetadata {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  author: {
    login: string;
    avatarUrl: string;
  };
  head: {
    label: string;
    ref: string;
    sha: string;
  };
  base: {
    label: string;
    ref: string;
    sha: string;
  };
}

export interface NormalizedPullRequestData {
  owner: string;
  repo: string;
  pullNumber: number;
  metadata: PRMetadata;
  files: PRFileChange[];
  totalFilesChanged: number;
  summary: {
    additions: number;
    deletions: number;
    changedFilesCount: number;
  };
}

export interface SyncDocumentationInput {
  owner: string;
  repo: string;
  pullNumber: number;
  filePath: string;
  content: string;
  commitMessage?: string;
  token?: string;
  expectedSha?: string;
}

export interface DocumentationSyncResult {
  success: boolean;
  repository: string;
  branch: string;
  filePath: string;
  commitSha?: string;
  commitUrl?: string;
  status: "SYNCED" | "CONFLICT" | "UNAUTHORIZED" | "NOT_FOUND" | "FAILED";
  message: string;
}

export interface UserRepoSummary {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string | null;
  htmlUrl: string;
}

export interface OpenPRSummary {
  number: number;
  title: string;
  author: string;
  headRef: string;
  baseRef: string;
  createdAt: string;
  updatedAt: string;
  isDraft: boolean;
  htmlUrl: string;
}

export class GitHubServiceError extends Error {
  public readonly statusCode?: number;
  public readonly code: "INVALID_INPUT" | "NOT_FOUND" | "UNAUTHORIZED" | "RATE_LIMITED" | "API_ERROR";

  constructor(
    message: string,
    code: "INVALID_INPUT" | "NOT_FOUND" | "UNAUTHORIZED" | "RATE_LIMITED" | "API_ERROR",
    statusCode?: number
  ) {
    super(message);
    this.name = "GitHubServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
