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

export type FilterOption = {
  id: number;
  name: string;
  slug: string;
};

export type ColorOption = {
  id: number;
  name: string;
  hex: string;
};

export type SizeOption = {
  id: number;
  label: string;
};

export type FiltersResponse = {
  genders: Gender[];
  categories: FilterOption[];
  fits: FilterOption[];
  materials: FilterOption[];
  colors: ColorOption[];
  sizes: SizeOption[];
};

export type ProductListResponse = {
  data: Product[];
  page: number;
  limit: number;
  total: number;
};

export type PriceTier = {
  min_qty: number;
  unit_price: number;
};

export type ProductDetail = Product & {
  price_tiers: PriceTier[];
};

export type CreateOrderPayload = {
  origin: 'online';
  customer: { name: string; phone?: string; note?: string };
  delivery: 'pickup' | 'delivery';
  address?: string;
  items: { variantId: string; qty: number }[];
};

export type CreateOrderResponse = {
  code: string;
  whatsappUrl: string;
};

