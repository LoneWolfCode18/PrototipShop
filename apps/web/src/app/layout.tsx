import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'RKeens · Catálogo Digital',
  description: 'Polos, poleras y conjuntos para dama y caballero (Gamarra). Pedidos directos por WhatsApp.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full bg-neutral-50 text-neutral-900 antialiased">
      <body className="flex min-h-full flex-col">
        <Navbar />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} RKeens — Galería en Gamarra, Lima · Pedidos sin pasarela vía WhatsApp</p>
        </footer>
      </body>
    </html>
  );
}

