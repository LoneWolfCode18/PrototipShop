import type { CreateOrderPayload, CreateOrderResponse, ProductDetail } from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/** Error con código HTTP para distinguir 404, 501, etc. en los componentes. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'API_ERROR',
      body?.error?.message ?? `Error ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}

export async function getProduct(slug: string): Promise<ProductDetail> {
  return api<ProductDetail>(`/products/${slug}`);
}

export async function validateCart(items: { variantId: string; qty: number }[]) {
  return api<{ valid: boolean; errors?: string[] }>('/cart/validate', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  return api<CreateOrderResponse>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
