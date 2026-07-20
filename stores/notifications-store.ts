import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import * as api from '@/lib/api';
import { zustandStorage } from '@/lib/storage';
import type { NotificationInviteStatus, NotificationItem } from '@/lib/types';

type NotificationsState = {
  notifications: NotificationItem[];
  hasLoaded: boolean;

  loadNotifications: () => Promise<void>;
  markRead: (id: string) => void;
  markAllRead: () => void;
  respondToInvite: (id: string, status: NotificationInviteStatus) => void;
};

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],
      hasLoaded: false,

      loadNotifications: async () => {
        if (get().hasLoaded) {
          return;
        }

        const notifications = await api.fetchNotifications();
        set({ notifications, hasLoaded: true });
      },

      markRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.id === id && item.unread ? { ...item, unread: false } : item,
          ),
        })),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((item) => (item.unread ? { ...item, unread: false } : item)),
        })),

      respondToInvite: (id, status) =>
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.id === id ? { ...item, unread: false, inviteStatus: status } : item,
          ),
        })),
    }),
    {
      name: 'retalk-notifications',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ notifications: state.notifications, hasLoaded: state.hasLoaded }),
    },
  ),
);

export function selectUnreadNotificationCount(state: NotificationsState) {
  return state.notifications.reduce((total, item) => total + (item.unread ? 1 : 0), 0);
}
