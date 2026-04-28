/**
 * BioVault API client — mirrors backend routes under NEXT_PUBLIC_API_URL (default /api/v1).
 */
const API_BASE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : "http://localhost:8000/api/v1";

export type UserResponse = {
  id: string;
  email: string;
  username: string;
  created_at: string;
};

export type RegisterWalletSummary = {
  address: string;
  created_at: string;
};

export type RegisterResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserResponse;
  wallet: RegisterWalletSummary;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type WalletResponse = {
  address: string;
  public_key: string;
  created_at: string;
  network: string;
};

/** Combined response from POST /transaction/simulate */
export type TransactionSimulateCombined = {
  transaction_id: number;
  preview: {
    from_address: string;
    to_address: string;
    amount: number;
    gas_fee: number;
    total?: number;
    estimated_time?: string;
    gas_units?: number;
    network?: string;
    chain_id?: number | null;
    warning?: string;
  };
  fraud_analysis: {
    risk_score: number;
    risk_level: string;
    recommendation: string;
    factors: Record<string, boolean | string | number>;
  };
  warnings: string[];
};

/** POST /fraud/check — risk_score is 0–100 */
export type FraudCheckApiResponse = {
  wallet_address: string;
  to_address: string;
  amount: number;
  risk_score: number;
  risk_level: string;
  recommendation: string;
  factors: Record<string, boolean | string | number>;
};

export type GuardianDto = {
  id: string;
  guardian_name: string;
  guardian_email: string;
  relationship: string;
  is_verified: boolean;
  created_at: string;
};

export type RecoveryStatus = {
  recovery_id: number;
  status: string;
  approval_count: number;
  required_approvals: number;
  approvals: { guardian_id: number; approved: boolean; approved_at: string }[];
  created_at: string;
};

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { detail?: unknown };
    if (typeof j.detail === "string") return j.detail;
    if (Array.isArray(j.detail)) return JSON.stringify(j.detail);
  } catch {
    /* ignore */
  }
  return text || res.statusText;
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, ...init } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
  };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  baseUrl: API_BASE,

  register(body: { email: string; username: string }) {
    return request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  login(body: {
    username: string;
    credential_id?: string;
    client_data?: Record<string, unknown>;
    assertion_object?: Record<string, unknown>;
  }) {
    return request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        credential_id: body.credential_id ?? "prototype",
        client_data: body.client_data ?? {},
        assertion_object: body.assertion_object ?? {},
        username: body.username,
      }),
    });
  },

  logout() {
    return request<{ message: string }>("/auth/logout", { method: "POST" });
  },

  newDeviceLogin(email: string) {
    return request<{ message: string; status: string }>("/auth/new-device", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  verifyOtp(email: string, code: string) {
    return request<TokenResponse>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
  },

  me(token: string) {
    return request<UserResponse>("/auth/me", { method: "GET", token });
  },

  generateWallet(token: string) {
    return request<WalletResponse>("/wallet/generate", { method: "POST", token, body: "{}" });
  },

  walletInfo(token: string) {
    return request<{
      address: string;
      public_key: string;
      balance: number;
      transaction_count: number;
      network: string;
      created_at: string;
    }>("/wallet/info", { method: "GET", token });
  },

  /** Backend returns placeholder list; prefer transactionHistory when authenticated */
  walletTransactions(limit = 10, offset = 0) {
    const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    return request<{ total: number; transactions: unknown[] }>(
      `/wallet/transactions?${q.toString()}`,
      { method: "GET" }
    );
  },

  balance(address: string) {
    const q = new URLSearchParams({ wallet_address: address });
    return request<{ address: string; balance: number; currency: string }>(
      `/wallet/balance?${q.toString()}`,
      { method: "GET" }
    );
  },

  /** Requires JWT; from_address must match user's wallet */
  simulateTransaction(
    token: string,
    body: { from_address: string; to_address: string; amount: number; data?: string | null }
  ) {
    return request<TransactionSimulateCombined>("/transaction/simulate", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },

  transactionExecute(
    token: string,
    body: {
      from_address: string;
      to_address: string;
      amount: number;
      data?: string | null;
      gas_limit?: number | null;
      gas_fee?: number | null;
    }
  ) {
    return request<{
      transaction_id: number;
      status: string;
      from: string;
      to: string;
      amount: number;
      created_at: string;
      message: string;
    }>("/transaction/execute", { method: "POST", token, body: JSON.stringify(body) });
  },

  transactionHistory(token: string, limit = 50, offset = 0) {
    const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    return request<{
      total: number;
      transactions: Array<{
        id: number;
        from: string;
        to: string;
        amount: number;
        status: string;
        gas_fee: number;
        created_at: string;
        fraud_analysis: { risk_score: number | null; risk_level: string | null; recommendation: string | null } | null;
      }>;
    }>(`/transaction/history?${q.toString()}`, { method: "GET", token });
  },

  transactionDetails(token: string, transactionId: number) {
    return request<{
      id: number;
      from: string;
      to: string;
      amount: number;
      status: string;
      hash: string | null;
      gas_fee: number;
      created_at: string;
      executed_at: string | null;
      fraud_analysis: { risk_score: number | null; risk_level: string | null; recommendation: string | null } | null;
    }>(`/transaction/${transactionId}`, { method: "GET", token });
  },

  fraudCheck(token: string, body: { wallet_address: string; to_address: string; amount: number }) {
    return request<FraudCheckApiResponse>("/fraud/check", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },

  fraudUserProfile(token: string) {
    return request<{
      user_id: number;
      total_transactions: number;
      average_transaction_amount: number;
      unique_recipients: number;
      high_risk_transactions: number;
      blocked_transactions: number;
    }>("/fraud/user-profile", { method: "GET", token });
  },

  fraudMetrics() {
    return request<{
      model_version: string;
      model_type: string;
      last_model_update: string;
      total_transactions_analyzed: number;
      fraud_detected_count: number;
      detection_rate: number;
      model_accuracy: number;
    }>("/fraud/metrics", { method: "GET" });
  },

  guardianAdd(token: string, body: { guardian_name: string; guardian_email: string; relationship: string }) {
    return request<GuardianDto>("/guardian/add", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },

  guardianList(token: string) {
    return request<GuardianDto[]>("/guardian/list", { method: "GET", token });
  },

  guardianInvite(token: string, guardianId: number) {
    return request<{ message: string; status: string }>("/guardian/invite", {
      method: "POST",
      token,
      body: JSON.stringify({ guardian_id: guardianId }),
    });
  },

  guardianVerify(body: { guardian_id: number; otp_code: string }) {
    return request<GuardianDto>("/guardian/verify", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  recoveryRequest(token: string) {
    return request<{
      recovery_id: number;
      status: string;
      created_at: string;
      message: string;
    }>("/recovery/request", { method: "POST", token });
  },

  recoveryApprove(body: { recovery_request_id: number; guardian_id: number }) {
    return request<RecoveryStatus>("/recovery/approve", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  recoveryStatus(token: string, recoveryRequestId: number) {
    return request<RecoveryStatus>(`/recovery/status/${recoveryRequestId}`, { method: "GET", token });
  },

  /**
   * Get challenge for WebAuthn fingerprint registration
   */
  getRegistrationChallenge(token: string, email: string, username: string) {
    return request<{
      challenge: string;
      session_key: string;
      options: any;
    }>("/auth/webauthn/register/start", {
      method: "POST",
      token,
      body: JSON.stringify({ email, username }),
    });
  },

  /**
   * Complete WebAuthn fingerprint registration
   */
  completeWebAuthnRegistration(token: string, attestation: any, sessionKey: string) {
    return request<{
      credential_id: string;
      message: string;
    }>("/auth/webauthn/register/complete", {
      method: "POST",
      token,
      body: JSON.stringify({
        ...attestation,
        session_key: sessionKey,
      }),
    });
  },

  /**
   * Get challenge for WebAuthn fingerprint authentication (login)
   */
  getAuthenticationChallenge(username: string) {
    return request<{
      challenge: string;
      session_key: string;
      credential_ids: string[];
      options: any;
    }>("/auth/webauthn/authenticate/start", {
      method: "POST",
      body: JSON.stringify({ username }),
    });
  },

  /**
   * Complete WebAuthn fingerprint authentication
   */
  completeWebAuthnLogin(username: string, assertion: any, sessionKey: string) {
    return request<TokenResponse>("/auth/webauthn/authenticate/complete", {
      method: "POST",
      body: JSON.stringify({ 
        username,
        assertion_data: assertion,
        session_key: sessionKey,
      }),
    });
  },
};
