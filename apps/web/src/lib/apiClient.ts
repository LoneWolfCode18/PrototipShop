const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}
