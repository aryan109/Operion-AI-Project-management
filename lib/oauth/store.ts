// Ephemeral code store for PKCE authorization codes (10 minute TTL)
export interface AuthCodeEntry {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  orgId: string;
  createdAt: number;
}

// Global store attached to globalThis to persist across hot reloads in dev and modules
const globalForOAuth = globalThis as unknown as {
  authCodesStore: Map<string, AuthCodeEntry> | undefined;
};

export const authCodesStore =
  globalForOAuth.authCodesStore ?? new Map<string, AuthCodeEntry>();

if (process.env.NODE_ENV !== "production") {
  globalForOAuth.authCodesStore = authCodesStore;
}
