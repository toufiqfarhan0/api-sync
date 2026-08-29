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
