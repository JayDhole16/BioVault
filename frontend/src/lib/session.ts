/** Client-side session keys for the BioVault prototype */

export const STORAGE = {
  TOKEN: "biovault_token",
  USER: "biovault_user",
  WALLET: "biovault_wallet",
  USERNAME: "biovault_username",
} as const;

export type StoredUser = { id: string; email: string; username: string };

export type StoredWallet = {
  address: string;
  public_key: string;
  network: string;
  created_at: string;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE.TOKEN);
}

export function setSession(token: string, user: StoredUser, username?: string) {
  localStorage.setItem(STORAGE.TOKEN, token);
  localStorage.setItem(STORAGE.USER, JSON.stringify(user));
  if (username) localStorage.setItem(STORAGE.USERNAME, username);
}

export function setWallet(wallet: StoredWallet) {
  localStorage.setItem(STORAGE.WALLET, JSON.stringify(wallet));
}

export function getWallet(): StoredWallet | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE.WALLET);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredWallet;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE.TOKEN);
  localStorage.removeItem(STORAGE.USER);
  localStorage.removeItem(STORAGE.WALLET);
  localStorage.removeItem(STORAGE.USERNAME);
}
