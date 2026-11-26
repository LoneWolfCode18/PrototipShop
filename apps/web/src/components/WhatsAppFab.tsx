'use client';

import { useSettings } from '@/lib/settings';

export function WhatsAppFab() {
  const s = useSettings();
  if (!s.whatsapp_number) return null;

  const msg = s.welcome_message
    ? `Hola, vi su catálogo y quisiera más información.`
    : `Hola, quisiera hacer un pedido.`;
  const url = `https://wa.me/${s.whatsapp_number}?text=${encodeURIComponent(msg)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-6 left-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition hover:scale-110 hover:shadow-xl active:scale-95"
    >
      <WhatsAppSvg />
    </a>
  );
}

function WhatsAppSvg() {
  return (
    <svg viewBox="0 0 32 32" fill="white" className="h-7 w-7" aria-hidden="true">
      <path d="M16 2C8.268 2 2 8.268 2 16c0 2.49.655 4.826 1.8 6.845L2 30l7.345-1.775A13.93 13.93 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2Zm0 25.6a11.56 11.56 0 0 1-5.89-1.6l-.42-.25-4.36 1.055 1.08-4.245-.275-.435A11.552 11.552 0 0 1 4.4 16C4.4 9.59 9.59 4.4 16 4.4S27.6 9.59 27.6 16 22.41 27.6 16 27.6Zm6.345-8.645c-.347-.175-2.055-1.015-2.374-1.13-.318-.115-.55-.175-.78.175-.232.347-.9 1.13-1.1 1.362-.202.23-.404.26-.75.087-.347-.175-1.464-.54-2.79-1.72-1.03-.92-1.726-2.055-1.928-2.402-.202-.347-.022-.534.152-.707.157-.156.347-.405.52-.608.175-.202.232-.347.347-.578.116-.232.058-.434-.03-.608-.086-.175-.78-1.882-1.07-2.578-.28-.676-.565-.584-.78-.595l-.664-.012c-.23 0-.608.087-.925.434s-1.214 1.185-1.214 2.89 1.243 3.352 1.416 3.584c.175.23 2.447 3.735 5.93 5.237.829.358 1.476.572 1.98.733.832.265 1.59.228 2.187.138.667-.1 2.055-.84 2.345-1.652.29-.81.29-1.505.202-1.65-.086-.145-.318-.23-.665-.405Z"/>
    </svg>
  );
}
