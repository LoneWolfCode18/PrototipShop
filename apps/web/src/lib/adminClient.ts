/**
 * Cliente HTTP para los endpoints /admin.
 * Adjunta automáticamente el JWT de Supabase que se guarda en localStorage
 * bajo la clave estándar de Supabase Auth.
 */
import { ApiError } from './apiClient';
import { supabase } from './supabase';
import type {
  AdminCatalogs,
  AdminProduct,
  AdminUser,
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

export const duplicateProduct = (id: string) =>
  adminApi<{ id: string; slug: string }>(`/products/${id}/duplicate`, {
    method: 'POST',
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

/* ─── Storage ─────────────────────────────────────────────────── */

const BUCKET = 'product-images';
const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Solo se permiten imágenes JPG, PNG o WebP.';
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `El archivo supera el límite de 3 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  }
  return null;
}

export async function uploadProductImage(
  productId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new ApiError(500, 'UPLOAD_ERROR', error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteStorageImage(url: string): Promise<void> {
  // Extraer path relativo dentro del bucket a partir de la URL pública
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return; // URL externa, no es de Storage
  const path = url.slice(idx + marker.length);
  await supabase.storage.from(BUCKET).remove([path]);
}

export const reorderImages = (productId: string, ids: string[]) =>
  adminApi<{ ok: boolean }>(`/products/${productId}/images/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ ids }),
  });

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

/* ─── Mostrador ───────────────────────────────────────────────── */

export const listCounterProducts = () =>
  adminApi<{ data: import('./types').AdminProduct[] }>('/counter').then((r) => r.data);

export const updateCounterSettings = (
  productId: string,
  body: {
    show_in_counter?: boolean;
    counter_order?: number;
    is_counter_featured?: boolean;
  },
) =>
  adminApi<{ ok: boolean }>(`/counter/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const reorderCounter = (orderedIds: string[]) =>
  adminApi<{ ok: boolean }>('/counter/reorder', {
    method: 'PUT',
    body: JSON.stringify({ ids: orderedIds }),
  });

/* ─── Usuarios ────────────────────────────────────────────────── */
export const listUsers = () =>
  adminApi<{ data: AdminUser[] }>('/users').then((r) => r.data);

export const createUser = (body: {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'vendedor';
}) =>
  adminApi<AdminUser>('/users', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateUser = (
  id: string,
  body: {
    full_name?: string;
    role?: 'admin' | 'vendedor';
    is_active?: boolean;
  },
) =>
  adminApi<AdminUser>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
