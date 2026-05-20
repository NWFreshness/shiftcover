'use client';

const TOKEN_KEY = 'shiftcover_token';
const MANAGER_KEY = 'shiftcover_is_manager';
const EMPLOYEE_KEY = 'shiftcover_employee_id';
export const MANAGER_ONBOARDING_SKIP_KEY = 'shiftcover_manager_onboarding_skipped';

export interface Session {
  token: string;
  isManager: boolean;
}

export interface RegisterPayload {
  businessName: string;
  industryType: string;
  managerName: string;
  phone: string;
}

export interface RegisterResponse {
  token: string;
  businessId: string;
  employeeId: string;
  isManager: boolean;
  inviteCode: string;
}

export function saveSession(token: string, isManager: boolean, employeeId?: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(MANAGER_KEY, isManager ? '1' : '0');
  if (employeeId) localStorage.setItem(EMPLOYEE_KEY, employeeId);
  localStorage.removeItem(MANAGER_ONBOARDING_SKIP_KEY);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function isManager(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MANAGER_KEY) === '1';
}

export function getEmployeeId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(EMPLOYEE_KEY);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(MANAGER_KEY);
  localStorage.removeItem(EMPLOYEE_KEY);
  localStorage.removeItem(MANAGER_ONBOARDING_SKIP_KEY);
}

export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('+')) return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits ? `+${digits}` : '';
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Could not create business');
  }
  return data;
}

// fetch wrapper that attaches the auth token and JSON headers
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(path, { ...options, headers });
}
