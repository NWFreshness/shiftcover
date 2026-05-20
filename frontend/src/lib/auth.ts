'use client';

const TOKEN_KEY = 'shiftcover_token';
const MANAGER_KEY = 'shiftcover_is_manager';

export interface Session {
  token: string;
  isManager: boolean;
}

export function saveSession(token: string, isManager: boolean) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(MANAGER_KEY, isManager ? '1' : '0');
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function isManager(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MANAGER_KEY) === '1';
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(MANAGER_KEY);
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
