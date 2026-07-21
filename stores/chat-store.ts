import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import * as api from '@/lib/api';
import { zustandStorage } from '@/lib/storage';
import type { ChatThread, EventItem } from '@/lib/types';
import { useSessionStore } from '@/stores/session-store';

type ChatState = {
  threads: ChatThread[];
  hasLoaded: boolean;
  error: string | null;

  loadThreads: () => Promise<void>;
  loadThreadMessages: (chatId: string) => Promise<void>;
  joinEventChat: (event: EventItem) => Promise<string>;
  startDirectChat: (memberName: string, memberUserId: string, eventId?: string) => Promise<string>;
  sendMessage: (chatId: string, text: string, author: string) => void;
  markThreadRead: (chatId: string) => void;
  dismissError: () => void;
};

function upsertThread(threads: ChatThread[], thread: ChatThread, replaceMessages = false) {
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
              unreadCount: thread.unreadCount,
              pinned: thread.pinned ?? candidate.pinned,
              tags: thread.tags ?? candidate.tags,
              eventId: thread.eventId ?? candidate.eventId,
              messages:
                replaceMessages || !candidate.messages.length ? thread.messages : candidate.messages,
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
        const token = useSessionStore.getState().token;

        if (!token) {
          set({ hasLoaded: true });
          return;
        }

        try {
          const threads = await api.fetchChatThreads(token);
          set((state) => ({
            // Keep any threads created locally before the fetch resolved.
            threads: threads.reduce((acc, thread) => upsertThread(acc, thread), state.threads),
            hasLoaded: true,
          }));
        } catch {
          set((state) => ({
            error: state.hasLoaded ? state.error : "Couldn't load chats. Try again.",
          }));
        }
      },

      loadThreadMessages: async (chatId) => {
        const token = useSessionStore.getState().token;

        if (!token) {
          return;
        }

        try {
          const thread = await api.fetchChatThread(chatId, token);
          set((state) => ({ threads: upsertThread(state.threads, thread, true) }));
        } catch {
          // Keep whatever messages are already cached locally for this thread.
        }
      },

      joinEventChat: async (event) => {
        const token = useSessionStore.getState().token;
        const existing = get().threads.find(
          (thread) => thread.kind === 'event' && thread.eventId === event.id,
        );

        if (existing) {
          return existing.id;
        }

        if (!token) {
          throw new Error('You need to sign in to join this chat.');
        }

        const thread = await api.joinEventChat(event, token);
        set((state) => ({ threads: upsertThread(state.threads, thread) }));

        return thread.id;
      },

      startDirectChat: async (memberName, memberUserId, eventId) => {
        set({ error: null });

        const token = useSessionStore.getState().token;

        if (!token) {
          throw new Error('You need to sign in to start this chat.');
        }

        const thread = await api.startDirectChat(memberName, memberUserId, token, eventId);
        set((state) => ({ threads: upsertThread(state.threads, thread) }));

        return thread.id;
      },

      sendMessage: (chatId, text, author) => {
        set({ error: null });

        const token = useSessionStore.getState().token;
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

        if (!token) {
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
          return;
        }

        api
          .sendChatMessage(chatId, text, token)
          .then((confirmedMessage) => {
            set((state) => ({
              threads: state.threads.map((thread) =>
                thread.id === chatId
                  ? {
                      ...thread,
                      messages: thread.messages.map((message) =>
                        message.id === optimisticId ? confirmedMessage : message,
                      ),
                    }
                  : thread,
              ),
            }));
          })
          .catch(() => {
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

      markThreadRead: (chatId) => {
        set((state) => ({
          threads: state.threads.map((thread) =>
            thread.id === chatId && thread.unreadCount > 0
              ? { ...thread, unreadCount: 0 }
              : thread,
          ),
        }));

        const token = useSessionStore.getState().token;

        if (token) {
          api.markChatThreadRead(chatId, token).catch(() => {});
        }
      },

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
      thread.kind === 'event' && thread.eventId ? [thread.eventId] : [],
    ),
  );
}
