const KEY = 'jsradar_tokens';

export interface SavedToken {
  token: string;
  label: string; // first 6 + … + last 4
}

function mask(token: string): string {
  if (token.length <= 12) return token.slice(0, 4) + '…';
  return token.slice(0, 6) + '…' + token.slice(-4);
}

function load(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

function persist(data: Record<string, string[]>) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function saveToken(provider: string, token: string): void {
  if (!token.trim()) return;
  const all = load();
  const list = all[provider] ?? [];
  const deduped = [token, ...list.filter((t) => t !== token)].slice(0, 5);
  all[provider] = deduped;
  persist(all);
}

export function getTokens(provider: string): SavedToken[] {
  return (load()[provider] ?? []).map((t) => ({ token: t, label: mask(t) }));
}

export function deleteToken(provider: string, token: string): void {
  const all = load();
  all[provider] = (all[provider] ?? []).filter((t) => t !== token);
  persist(all);
}
