import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type Language = 'ja' | 'en';

interface SettingsState {
  theme: Theme;
  language: Language;
  syncEnabled: boolean;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  toggleSync: () => void;
  clearCache: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'ja',
      syncEnabled: true,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      toggleSync: () => set((state) => ({ syncEnabled: !state.syncEnabled })),
      clearCache: async () => {
        // キャッシュクリア処理
        await Promise.all([
          caches.keys().then((cacheNames) => {
            return Promise.all(
              cacheNames.map((cacheName) => {
                return caches.delete(cacheName);
              })
            );
          }),
        ]);
      },
    }),
    {
      name: 'settings-storage',
    }
  )
);
