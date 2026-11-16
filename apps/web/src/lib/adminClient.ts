/**
 * Cliente HTTP para los endpoints /admin.
 * Adjunta automáticamente el JWT de Supabase que se guarda en localStorage
 * bajo la clave estándar de Supabase Auth.
 */
import { ApiError } from './apiClient';
import type {
  AdminCatalogs,
  AdminProduct,
  DashboardStats,
  Order,
  OrderStatus,
  PriceTier,
} from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Supabase guarda el token con la clave: sb-<project_ref>-auth-token
  // Para no hardcodear la clave, buscamos la primera entrada que coincida.
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
      try {
        const val = JSON.parse(localStorage.getItem(key) ?? '{}');
        return (val.access_token as string) ?? null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function adminApi<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}/admin${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
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

/* ─── Dashboard ───────────────────────────────────────────────── */
export const getStats = () => adminApi<DashboardStats>('/stats');

/* ─── Productos ───────────────────────────────────────────────── */
export const listAdminProducts = () =>
  adminApi<{ data: AdminProduct[] }>('/products').then((r) => r.data);

export const getAdminProduct = (id: string) => adminApi<AdminProduct>(`/products/${id}`);

export const createProduct = (body: Record<string, unknown>) =>
  adminApi<{ id: string; slug: string }>('/products', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateProduct = (id: string, body: Record<string, unknown>) =>
  adminApi<{ id: string }>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

export const setProductStatus = (id: string, is_active: boolean) =>
  adminApi<{ ok: boolean }>(`/products/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active }),
  });

/* ─── Variantes ───────────────────────────────────────────────── */
export const createVariant = (productId: string, body: Record<string, unknown>) =>
  adminApi<{ id: string }>(`/products/${productId}/variants`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateVariant = (variantId: string, body: Record<string, unknown>) =>
  adminApi<{ id: string }>(`/variants/${variantId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

export const deleteVariant = (variantId: string) =>
  adminApi<{ ok: boolean }>(`/variants/${variantId}`, { method: 'DELETE' });

export const adjustStock = (variantId: string, delta: number, reason: string) =>
  adminApi<{ stock: number }>(`/variants/${variantId}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ delta, reason }),
  });

/* ─── Precios por mayor ────────────────────────────────────────── */
export const setPriceTiers = (productId: string, tiers: Omit<PriceTier, 'id'>[]) =>
  adminApi<{ ok: boolean }>(`/products/${productId}/price-tiers`, {
    method: 'PUT',
    body: JSON.stringify({ tiers }),
  });

/* ─── Imágenes ────────────────────────────────────────────────── */
export const addImage = (
  productId: string,
  body: { url: string; alt?: string; sort_order?: number; color_id?: number },
) =>
  adminApi<{ id: string }>(`/products/${productId}/images`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const deleteImage = (imageId: string) =>
  adminApi<{ ok: boolean }>(`/images/${imageId}`, { method: 'DELETE' });

/* ─── Pedidos ─────────────────────────────────────────────────── */
export const listOrders = (status?: OrderStatus) =>
  adminApi<{ data: Order[] }>(`/orders${status ? `?status=${status}` : ''}`).then((r) => r.data);

export const getOrder = (id: string) => adminApi<Order>(`/orders/${id}`);

export const setOrderStatus = (id: string, status: Exclude<OrderStatus, 'enviado_whatsapp'>) =>
  adminApi<{ ok: boolean; status: OrderStatus }>(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

/* ─── Stock ───────────────────────────────────────────────────── */
export const getLowStock = () =>
  adminApi<{ data: DashboardStats['lowStockItems'] }>('/stock/low').then((r) => r.data);

/* ─── Settings ────────────────────────────────────────────────── */
export const getAdminSettings = () => adminApi<Record<string, unknown>>('/settings');

export const updateSettings = (body: Record<string, unknown>) =>
  adminApi<Record<string, unknown>>('/settings', {
    method: 'PUT',
    body: JSON.stringify(body),
  });

/* ─── Catálogos ────────────────────────────────────────────────── */
export const getCatalogs = () => adminApi<AdminCatalogs>('/catalogs');
