import { create } from 'zustand';

export interface NotificationSettings {
  lessonReminder: boolean;
  newMessage: boolean;
  systemUpdate: boolean;
}

interface NotificationStore {
  settings: NotificationSettings;
  setSettings: (settings: NotificationSettings) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  settings: {
    lessonReminder: true,
    newMessage: true,
    systemUpdate: true,
  },
  setSettings: (settings) => set({ settings }),
}));
