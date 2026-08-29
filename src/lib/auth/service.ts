import crypto from "crypto";
import { Octokit } from "@octokit/rest";
import { AuthError, GitHubUserProfile, SafeUserSessionResponse, UserSessionData } from "./types";

export const SESSION_COOKIE_NAME = "apisync_session";
export const STATE_COOKIE_NAME = "github_oauth_state";

export function generateOAuthState(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function buildGitHubAuthUrl(clientId: string, state: string, redirectUri?: string): string {
  if (!clientId) {
    throw new AuthError("GITHUB_APP_CLIENT_ID environment variable is missing.", "MISSING_CLIENT_ID");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    state,
    scope: "repo read:org",
  });

  if (redirectUri) {
    params.append("redirect_uri", redirectUri);
  }

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForAccessToken(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  if (!code || !clientId || !clientSecret) {
    throw new AuthError("Missing code, clientId, or clientSecret for OAuth token exchange.", "OAUTH_FAILED");
  }

  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const data = await response.json();

    if (data.error || !data.access_token) {
      throw new AuthError(`GitHub OAuth error: ${data.error_description || data.error || "Token exchange failed"}`, "OAUTH_FAILED");
    }

    return data.access_token as string;
  } catch (err: unknown) {
    if (err instanceof AuthError) throw err;
    const error = err as { message?: string };
    throw new AuthError(`GitHub OAuth exchange failed: ${error.message || "Unknown error"}`, "OAUTH_FAILED");
  }
}

export async function fetchGitHubUserProfile(accessToken: string): Promise<GitHubUserProfile> {
  try {
    const octokit = new Octokit({ auth: accessToken });
    const userRes = await octokit.rest.users.getAuthenticated();

    return {
      login: userRes.data.login,
      id: userRes.data.id,
      avatarUrl: userRes.data.avatar_url,
      name: userRes.data.name || undefined,
      email: userRes.data.email || undefined,
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    throw new AuthError(`Failed to fetch GitHub user profile: ${error.message || "Unknown error"}`, "UNAUTHORIZED");
  }
}

/**
 * Derives a 256-bit encryption key strictly from SESSION_SECRET environment variable.
 * Throws a server configuration error if SESSION_SECRET is missing.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;

  if (!secret || !secret.trim()) {
    throw new AuthError(
      "SESSION_SECRET environment variable is missing. A dedicated server-side secret is required for session encryption.",
      "UNAUTHORIZED"
    );
  }

  return crypto.createHash("sha256").update(secret.trim()).digest();
}

/**
 * Encrypts session data using AES-256-GCM authenticated encryption.
 * Format: iv:authTag:encryptedPayload
 */
export function serializeSession(session: UserSessionData): string {
  const jsonStr = JSON.stringify(session);
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(jsonStr, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const payload = `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
  return Buffer.from(payload, "utf-8").toString("base64url");
}

/**
 * Decrypts and authenticates AES-256-GCM session cookie.
 * Rejects tampered payloads safely.
 */
export function parseSession(sessionCookieValue: string | undefined): UserSessionData | null {
  if (!sessionCookieValue) return null;

  try {
    const rawPayload = Buffer.from(sessionCookieValue, "base64url").toString("utf-8");
    const parts = rawPayload.split(":");

    if (parts.length !== 3) return null;

    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encryptedText = Buffer.from(parts[2], "hex");

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    const parsed = JSON.parse(decrypted.toString("utf-8")) as UserSessionData;

    if (!parsed.accessToken || !parsed.user || !parsed.user.login) {
      return null;
    }

    return parsed;
  } catch {
    // Rejects tampered cookies, bad keys, or invalid JSON
    return null;
  }
}

export function getSafeSessionResponse(session: UserSessionData | null): SafeUserSessionResponse {
  if (session) {
    return {
      authenticated: true,
      user: {
        login: session.user.login,
        avatarUrl: session.user.avatarUrl,
      },
      authMethod: "GITHUB_APP_OAUTH",
    };
  }

  // Local development fallback indicator if process.env.GITHUB_TOKEN exists
  if (process.env.GITHUB_TOKEN) {
    return {
      authenticated: false,
      authMethod: "LOCAL_DEVELOPMENT_TOKEN",
    };
  }

  return {
    authenticated: false,
  };
}
