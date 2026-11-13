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
  id?: string;
  min_qty: number;
  unit_price: number;
};

/* ─── Admin ───────────────────────────────────────────────────── */

export type OrderStatus =
  | 'enviado_whatsapp'
  | 'confirmado'
  | 'pagado'
  | 'entregado'
  | 'cancelado';

export type OrderItem = {
  id: string;
  variant_id: string | null;
  product_name: string;
  size_label: string;
  color_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type Order = {
  id: string;
  code: string;
  origin: 'online' | 'tienda';
  status: OrderStatus;
  customer_name: string | null;
  customer_phone: string | null;
  customer_note: string | null;
  delivery_type: 'recojo_galeria' | 'envio' | null;
  subtotal: number;
  total: number;
  created_at: string;
  items?: OrderItem[];
};

export type AdminVariant = {
  id: string;
  sku: string;
  stock: number;
  price_override: number | null;
  low_stock_threshold: number;
  is_active: boolean;
  size: { id: number; label: string } | null;
  color: { id: number; name: string; hex: string } | null;
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  gender: Gender;
  base_price: number;
  sale_price: number | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  category: { id: number; name: string; slug: string } | null;
  fit: { id: number; name: string; slug: string } | null;
  material: { id: number; name: string; slug: string } | null;
  images: { id: string; url: string; alt: string | null; sort_order: number }[];
  variants: AdminVariant[];
  price_tiers: PriceTier[];
};

export type AdminCatalogs = {
  categories: { id: number; name: string; slug: string }[];
  fits: { id: number; name: string; slug: string }[];
  materials: { id: number; name: string; slug: string }[];
  colors: { id: number; name: string; hex: string }[];
  sizes: { id: number; label: string; sort_order: number }[];
};

export type DashboardStats = {
  ordersToday: number;
  ordersPending: number;
  lowStockCount: number;
  lowStockItems: {
    variant_id: string;
    product_id: string;
    product_name: string;
    size: string;
    color: string;
    stock: number;
    low_stock_threshold: number;
  }[];
  recentOrders: Pick<Order, 'id' | 'code' | 'status' | 'customer_name' | 'total' | 'created_at'>[];
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

