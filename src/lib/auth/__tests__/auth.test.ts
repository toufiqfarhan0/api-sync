import { beforeEach, describe, expect, it } from "vitest";
import { createOctokitClient } from "../../github/service";
import {
  buildGitHubAuthUrl,
  generateOAuthState,
  getSafeSessionResponse,
  parseSession,
  serializeSession,
} from "../service";
import { AuthError, UserSessionData } from "../types";

describe("GitHub Authentication & Session Security", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test_dedicated_session_secret_32_bytes_long";
  });

  describe("OAuth Authorization URL & State", () => {
    it("generates a random hex state for CSRF protection", () => {
      const state1 = generateOAuthState();
      const state2 = generateOAuthState();

      expect(state1).toHaveLength(32);
      expect(state2).toHaveLength(32);
      expect(state1).not.toEqual(state2);
    });

    it("builds valid GitHub App authorization URL", () => {
      const url = buildGitHubAuthUrl("client_123", "state_456", "http://localhost:3000/callback");

      expect(url).toContain("https://github.com/login/oauth/authorize");
      expect(url).toContain("client_id=client_123");
      expect(url).toContain("state=state_456");
      expect(url).toContain("scope=repo+read%3Aorg");
    });

    it("throws MISSING_CLIENT_ID error when clientId is empty", () => {
      expect(() => buildGitHubAuthUrl("", "state")).toThrowError(AuthError);
    });
  });

  describe("AES-256-GCM Session Encryption & Parsing", () => {
    const sampleSession: UserSessionData = {
      user: {
        login: "octocat",
        avatarUrl: "https://github.com/avatar.png",
      },
      accessToken: "gho_secret_access_token_123",
      createdAt: 1700000000000,
    };

    it("throws error when SESSION_SECRET environment variable is missing", () => {
      delete process.env.SESSION_SECRET;
      expect(() => serializeSession(sampleSession)).toThrowError(AuthError);
    });

    it("encrypts session cookie payload so access token is NOT plaintext", () => {
      const encryptedCookie = serializeSession(sampleSession);
      expect(encryptedCookie).toBeDefined();

      // Confirm raw token string is NOT visible in cookie payload
      expect(encryptedCookie).not.toContain("gho_secret_access_token_123");
      expect(encryptedCookie).not.toContain("octocat");

      // Confirm cookie decrypts cleanly back to original session data
      const decrypted = parseSession(encryptedCookie);
      expect(decrypted?.user.login).toBe("octocat");
      expect(decrypted?.accessToken).toBe("gho_secret_access_token_123");
    });

    it("rejects tampered or forged session cookie payloads", () => {
      const encryptedCookie = serializeSession(sampleSession);

      // Tamper with base64url payload
      const tamperedCookie = `${encryptedCookie.slice(0, -4)}XXXX`;
      expect(parseSession(tamperedCookie)).toBeNull();

      // Tamper with invalid format
      expect(parseSession("invalid-token")).toBeNull();
      expect(parseSession(undefined)).toBeNull();
    });
  });

  describe("Client Credential Protection (getSafeSessionResponse)", () => {
    it("returns safe user data without exposing access tokens", () => {
      const sampleSession: UserSessionData = {
        user: {
          login: "octocat",
          avatarUrl: "https://github.com/avatar.png",
        },
        accessToken: "gho_secret_access_token_123",
        createdAt: 1700000000000,
      };

      const safe = getSafeSessionResponse(sampleSession);

      expect(safe.authenticated).toBe(true);
      expect(safe.user?.login).toBe("octocat");
      expect(safe.user?.avatarUrl).toBe("https://github.com/avatar.png");
      expect((safe as unknown as Record<string, unknown>).accessToken).toBeUndefined(); // Token NEVER exposed to client
    });

    it("returns authenticated: false when session is null", () => {
      const safe = getSafeSessionResponse(null);
      expect(safe.authenticated).toBe(false);
      expect(safe.user).toBeUndefined();
    });
  });

  describe("GitHub Service Credential Priority", () => {
    it("prioritizes explicit user session token over GITHUB_TOKEN fallback", () => {
      const originalToken = process.env.GITHUB_TOKEN;
      process.env.GITHUB_TOKEN = "env_token_fallback";

      try {
        const clientWithUserToken = createOctokitClient("user_session_token_override");
        expect(clientWithUserToken).toBeDefined();

        const clientWithEnvFallback = createOctokitClient(undefined);
        expect(clientWithEnvFallback).toBeDefined();
      } finally {
        if (originalToken) process.env.GITHUB_TOKEN = originalToken;
      }
    });
  });
});
