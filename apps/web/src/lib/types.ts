export type Gender = 'dama' | 'caballero' | 'unisex';

export type Variant = {
  id: string;
  sku: string;
  stock: number;
  price_override: number | null;
  size: { label: string } | null;
  color: { name: string; hex: string } | null;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  gender: Gender;
  base_price: number;
  sale_price: number | null;
  final_price: number;
  category: { name: string; slug: string } | null;
  fit: { name: string; slug: string } | null;
  material: { name: string; slug: string } | null;
  images: { url: string; alt: string | null; sort_order: number }[];
  variants: Variant[];
};

export type StoreSettings = {
  store_name: string;
  whatsapp_number: string;
  gallery_address: string | null;
  opening_hours: string | null;
};
