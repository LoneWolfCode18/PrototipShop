import { Navbar } from '@/components/Navbar';

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="flex-1">{children}</div>
      <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
        <p>© {new Date().getFullYear()} RKeens — Galería en Gamarra, Lima · Pedidos sin pasarela vía WhatsApp</p>
      </footer>
    </>
  );
}
