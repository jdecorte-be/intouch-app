import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import * as api from '@/lib/api';
import { zustandStorage } from '@/lib/storage';
import type { ChatThread, EventItem } from '@/lib/types';

type ChatState = {
  threads: ChatThread[];
  hasLoaded: boolean;
  error: string | null;

  loadThreads: () => Promise<void>;
  joinEventChat: (event: EventItem) => Promise<string>;
  startDirectChat: (memberName: string, memberUserId: string) => Promise<string>;
  sendMessage: (chatId: string, text: string, author: string) => void;
  markThreadRead: (chatId: string) => void;
  dismissError: () => void;
};

function upsertThread(threads: ChatThread[], thread: ChatThread) {
  return threads.some((candidate) => candidate.id === thread.id)
    ? threads.map((candidate) =>
        candidate.id === thread.id
          ? {
              ...candidate,
              title: thread.title,
              subtitle: thread.subtitle,
              accent: thread.accent,
              initials: thread.initials,
              avatarImage: thread.avatarImage ?? candidate.avatarImage,
              messages: candidate.messages.length ? candidate.messages : thread.messages,
            }
          : candidate,
      )
    : [thread, ...threads];
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      threads: [],
      hasLoaded: false,
      error: null,

      loadThreads: async () => {
        try {
          const threads = await api.fetchChatThreads();
          set((state) => ({
            // Keep any threads created locally before the fetch resolved.
            threads: threads.reduce(upsertThread, state.threads),
            hasLoaded: true,
          }));
        } catch {
          set((state) => ({
            error: state.hasLoaded ? state.error : "Couldn't load chats. Try again.",
          }));
        }
      },

      joinEventChat: async (event) => {
        const chatId = `event-chat-${event.id}`;

        if (!get().threads.some((thread) => thread.id === chatId)) {
          const thread = await api.joinEventChat(event);
          set((state) => ({ threads: upsertThread(state.threads, thread) }));
        }

        return chatId;
      },

      startDirectChat: async (memberName, memberUserId) => {
        set({ error: null });

        const thread = await api.startDirectChat(memberName, memberUserId);
        set((state) => ({ threads: upsertThread(state.threads, thread) }));

        return thread.id;
      },

      sendMessage: (chatId, text, author) => {
        set({ error: null });

        const optimisticId = `${chatId}-${Date.now()}`;
        const optimisticMessage = {
          id: optimisticId,
          author,
          authorImage: null,
          fromSelf: true,
          text,
          sentAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        };

        set((state) => {
          const thread = state.threads.find((candidate) => candidate.id === chatId);

          if (!thread) {
            return state;
          }

          const updatedThread = { ...thread, messages: [...thread.messages, optimisticMessage] };

          return {
            threads: [
              updatedThread,
              ...state.threads.filter((candidate) => candidate.id !== chatId),
            ],
          };
        });

        api.sendChatMessage(chatId, text, author).catch(() => {
          set((state) => ({
            error: "Your message didn't send. Try again.",
            threads: state.threads.map((thread) =>
              thread.id === chatId
                ? {
                    ...thread,
                    messages: thread.messages.filter((message) => message.id !== optimisticId),
                  }
                : thread,
            ),
          }));
        });
      },

      markThreadRead: (chatId) =>
        set((state) => ({
          threads: state.threads.map((thread) =>
            thread.id === chatId && thread.unreadCount > 0
              ? { ...thread, unreadCount: 0 }
              : thread,
          ),
        })),

      dismissError: () => set({ error: null }),
    }),
    {
      name: 'retalk-chats',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ threads: state.threads, hasLoaded: state.hasLoaded }),
    },
  ),
);

export function selectUnreadCount(state: ChatState) {
  return state.threads.reduce((total, thread) => total + thread.unreadCount, 0);
}

export function selectSubscribedEventIds(state: ChatState) {
  return new Set(
    state.threads.flatMap((thread) =>
      thread.kind === 'event' && thread.id.startsWith('event-chat-')
        ? [thread.id.slice('event-chat-'.length)]
        : [],
    ),
  );
}
