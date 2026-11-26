/**
 * Acceso centralizado a store_settings.
 *
 * - En Server Components: usar `getSettings()` directamente.
 * - En Client Components: usar el hook `useSettings()` — requiere que un
 *   Server Component ancestro pase los settings via <SettingsProvider>.
 */

'use client';

import { createContext, useContext } from 'react';
import type { StoreSettings } from './types';

/* ── Valores por defecto (se usan cuando settings aún no cargó o como fallback) ── */
export const DEFAULT_SETTINGS: StoreSettings = {
  store_name:         'Tienda',
  whatsapp_number:    '',
  gallery_address:    null,
  opening_hours:      null,
  welcome_message:    null,
  logo_url:           null,
  primary_color:      '#111111',
  currency_symbol:    'S/',
  phone_country_code: '51',
  location_tag:       null,
  about_text:         null,
  hero_image_url:     null,
  hero_subtitle:      null,
  catalog_subtitle:   null,
  instagram_url:      null,
  facebook_url:       null,
  tiktok_url:         null,
};

/* ── Contexto React ── */
export const SettingsContext = createContext<StoreSettings>(DEFAULT_SETTINGS);

export function useSettings(): StoreSettings {
  return useContext(SettingsContext);
}

/* ── Helper: formatea dinero con el símbolo de la tienda ── */
export function makeMoney(symbol: string) {
  return (n: number) => `${symbol} ${n.toFixed(2)}`;
}

/* ── Helper: construye URL wa.me normalizando el número ── */
export function buildWaUrl(
  phone: string,
  countryCode: string,
  message: string,
): string {
  let num = phone.replace(/[\s\-+()\u00a0]/g, '');
  // Si parece un número local (empieza por 9 y tiene 9 dígitos), añadir prefijo
  if (new RegExp(`^[^${countryCode[0]}]`).test(num[0] ?? '') && num.length <= 9) {
    num = `${countryCode}${num}`;
  }
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}
