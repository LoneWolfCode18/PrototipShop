'use client';

import { SettingsContext } from '@/lib/settings';
import type { StoreSettings } from '@/lib/types';

export function SettingsClientProvider({
  settings,
  children,
}: {
  settings: StoreSettings;
  children: React.ReactNode;
}) {
  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}
