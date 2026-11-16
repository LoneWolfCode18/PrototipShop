import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RKeens · Catálogo Digital',
  description: 'Polos, poleras y conjuntos para dama y caballero (Gamarra). Pedidos directos por WhatsApp.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full bg-neutral-50 text-neutral-900 antialiased">
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
