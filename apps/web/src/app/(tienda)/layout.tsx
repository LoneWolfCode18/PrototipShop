import { Navbar } from '@/components/Navbar';
import { FooterServer } from '@/components/FooterServer';

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="flex-1">{children}</div>
      <FooterServer />
    </>
  );
}
