import type { Metadata } from 'next';
import './globals.css';
import { SettingsProvider } from '@/components/SettingsProvider';

export const metadata: Metadata = {
  title: 'Catálogo Digital',
  description: 'Catálogo de ropa con pedidos directos por WhatsApp.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full bg-neutral-50 text-neutral-900 antialiased">
      <body className="flex min-h-full flex-col">
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
