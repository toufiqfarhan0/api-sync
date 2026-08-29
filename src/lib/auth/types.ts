export interface GitHubUserProfile {
  login: string;
  id: number;
  avatarUrl: string;
  name?: string;
  email?: string;
}

export interface UserSessionData {
  user: {
    login: string;
    avatarUrl: string;
  };
  accessToken: string;
  createdAt: number;
}

export interface SafeUserSessionResponse {
  authenticated: boolean;
  user?: {
    login: string;
    avatarUrl: string;
  };
  authMethod?: "GITHUB_APP_OAUTH" | "LOCAL_DEVELOPMENT_TOKEN";
}

export class AuthError extends Error {
  public readonly code: "MISSING_CLIENT_ID" | "INVALID_STATE" | "OAUTH_FAILED" | "UNAUTHORIZED";

  constructor(
    message: string,
    code: "MISSING_CLIENT_ID" | "INVALID_STATE" | "OAUTH_FAILED" | "UNAUTHORIZED"
  ) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}
