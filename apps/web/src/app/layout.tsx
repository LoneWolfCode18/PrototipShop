import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RKeens · Catálogo',
  description: 'Polos, poleras y conjuntos para dama y caballero. Pedidos por WhatsApp.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
