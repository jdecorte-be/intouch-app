import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import * as api from '@/lib/api';
import { zustandStorage } from '@/lib/storage';
import type { ChatMessage, ChatParticipant, ChatThread, EventItem } from '@/lib/types';
import { useSessionStore } from '@/stores/session-store';

type PollVoteState = {
  counts: number[];
  myVote: number | null;
};

type ChatState = {
  threads: ChatThread[];
  hasLoaded: boolean;
  error: string | null;
  pollVotes: Record<string, PollVoteState>;

  loadThreads: () => Promise<void>;
  loadThreadMessages: (chatId: string) => Promise<void>;
  joinEventChat: (event: EventItem) => Promise<string>;
  startDirectChat: (memberName: string, memberUserId: string, eventId?: string) => Promise<string>;
  sendMessage: (chatId: string, text: string, author: string, image?: string | null) => void;
  addRandomParticipantToChat: (chatId: string) => void;
  toggleReaction: (chatId: string, messageId: string, emoji: string) => void;
  votePoll: (messageId: string, optionIndex: number, optionCount: number) => void;
  leaveChat: (chatId: string) => Promise<void>;
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
              icon: thread.icon ?? candidate.icon,
              avatarImage: thread.avatarImage ?? candidate.avatarImage,
              unreadCount: thread.unreadCount,
              pinned: thread.pinned ?? candidate.pinned,
              tags: thread.tags ?? candidate.tags,
              eventId: thread.eventId ?? candidate.eventId,
              participants: thread.participants ?? candidate.participants,
              participantCount: thread.participantCount ?? candidate.participantCount,
              messages:
                replaceMessages || !candidate.messages.length ? thread.messages : candidate.messages,
            }
          : candidate,
      )
    : [thread, ...threads];
}

const randomJoinParticipants: ChatParticipant[] = [
  { id: 'test-join-maya-chen', name: 'Maya Chen', image: null },
  { id: 'test-join-jordan-patel', name: 'Jordan Patel', image: null },
  { id: 'test-join-sam-rivera', name: 'Sam Rivera', image: null },
  { id: 'test-join-aisha-khan', name: 'Aisha Khan', image: null },
  { id: 'test-join-noah-williams', name: 'Noah Williams', image: null },
  { id: 'test-join-zoe-martin', name: 'Zoe Martin', image: null },
  { id: 'test-join-leo-thompson', name: 'Leo Thompson', image: null },
  { id: 'test-join-priya-shah', name: 'Priya Shah', image: null },
];

function createOverflowParticipant(chatId: string, index: number): ChatParticipant {
  return {
    id: `test-join-${chatId}-${Date.now()}-${index}`,
    name: `Guest ${index + 1}`,
    image: null,
  };
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      threads: [],
      hasLoaded: false,
      error: null,
      pollVotes: {},

      loadThreads: async () => {
        const hasSession = useSessionStore.getState().hasSession;

        if (!hasSession) {
          set({ hasLoaded: true });
          return;
        }

        try {
          const threads = await api.fetchChatThreads();
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
        const hasSession = useSessionStore.getState().hasSession;

        if (!hasSession) {
          return;
        }

        try {
          const thread = await api.fetchChatThread(chatId);
          set((state) => ({ threads: upsertThread(state.threads, thread, true) }));
        } catch {
          // Keep whatever messages are already cached locally for this thread.
        }
      },

      joinEventChat: async (event) => {
        const hasSession = useSessionStore.getState().hasSession;
        const existing = get().threads.find(
          (thread) => thread.kind === 'event' && thread.eventId === event.id,
        );

        if (existing) {
          return existing.id;
        }

        if (!hasSession) {
          throw new Error('You need to sign in to join this chat.');
        }

        const thread = await api.joinEventChat(event);
        set((state) => ({ threads: upsertThread(state.threads, thread) }));

        return thread.id;
      },

      startDirectChat: async (memberName, memberUserId, eventId) => {
        set({ error: null });

        const hasSession = useSessionStore.getState().hasSession;

        if (!hasSession) {
          throw new Error('You need to sign in to start this chat.');
        }

        const thread = await api.startDirectChat(memberName, memberUserId, eventId);
        set((state) => ({ threads: upsertThread(state.threads, thread) }));

        return thread.id;
      },

      sendMessage: (chatId, text, author, image) => {
        set({ error: null });

        const hasSession = useSessionStore.getState().hasSession;
        const optimisticId = `${chatId}-${Date.now()}`;
        const optimisticMessage = {
          id: optimisticId,
          author,
          authorId: useSessionStore.getState().user?.id ?? null,
          authorImage: null,
          fromSelf: true,
          text,
          image: image ?? null,
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

        if (!hasSession) {
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
          .sendChatMessage(chatId, text, image)
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

      addRandomParticipantToChat: (chatId) => {
        set((state) => {
          const thread = state.threads.find((candidate) => candidate.id === chatId);

          if (!thread) {
            return state;
          }

          const existingIds = new Set(thread.participants.map((participant) => participant.id));
          const availableParticipants = randomJoinParticipants.filter(
            (participant) => !existingIds.has(participant.id),
          );
          const nextParticipant =
            availableParticipants[Math.floor(Math.random() * availableParticipants.length)] ??
            createOverflowParticipant(chatId, thread.participants.length);
          const nextParticipants = [...thread.participants, nextParticipant];
          const joinMessage: ChatMessage = {
            id: `${chatId}-join-${nextParticipant.id}-${Date.now()}`,
            author: nextParticipant.name,
            authorId: nextParticipant.id,
            authorImage: nextParticipant.image,
            fromSelf: false,
            text: `${nextParticipant.name} joined the chat.`,
            sentAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            kind: 'system',
            reactions: [],
          };
          const updatedThread: ChatThread = {
            ...thread,
            participants: nextParticipants,
            participantCount: Math.max(thread.participantCount + 1, nextParticipants.length),
            messages: [...thread.messages, joinMessage],
          };

          return {
            threads: state.threads.map((candidate) =>
              candidate.id === chatId ? updatedThread : candidate,
            ),
          };
        });
      },

      toggleReaction: (chatId, messageId, emoji) => {
        const hasSession = useSessionStore.getState().hasSession;

        if (!hasSession) {
          return;
        }

        const applyOptimisticToggle = (reactions: ChatMessage['reactions'] = []) => {
          const existing = reactions.find((reaction) => reaction.emoji === emoji);

          if (!existing) {
            return [...reactions, { emoji, count: 1, reactedByMe: true }];
          }

          if (!existing.reactedByMe) {
            return reactions.map((reaction) =>
              reaction.emoji === emoji
                ? { ...reaction, count: reaction.count + 1, reactedByMe: true }
                : reaction,
            );
          }

          return reactions
            .map((reaction) =>
              reaction.emoji === emoji ? { ...reaction, count: reaction.count - 1, reactedByMe: false } : reaction,
            )
            .filter((reaction) => reaction.count > 0);
        };

        const updateMessageReactions = (
          threads: ChatThread[],
          updater: (reactions: ChatMessage['reactions']) => ChatMessage['reactions'],
        ) =>
          threads.map((thread) =>
            thread.id === chatId
              ? {
                  ...thread,
                  messages: thread.messages.map((message) =>
                    message.id === messageId ? { ...message, reactions: updater(message.reactions) } : message,
                  ),
                }
              : thread,
          );

        let previousReactions: ChatMessage['reactions'] | undefined;

        set((state) => {
          const thread = state.threads.find((candidate) => candidate.id === chatId);
          const message = thread?.messages.find((candidate) => candidate.id === messageId);
          previousReactions = message?.reactions;

          return { threads: updateMessageReactions(state.threads, applyOptimisticToggle) };
        });

        void (async () => {
          try {
            const confirmedMessage = await api.toggleChatMessageReaction(chatId, messageId, emoji);

            set((state) => ({
              threads: updateMessageReactions(state.threads, () => confirmedMessage.reactions),
            }));
          } catch {
            set((state) => ({
              error: "Couldn't update your reaction. Try again.",
              threads: updateMessageReactions(state.threads, () => previousReactions ?? []),
            }));
          }
        })();
      },

      votePoll: (messageId, optionIndex, optionCount) => {
        set((state) => {
          const existing = state.pollVotes[messageId] ?? {
            counts: new Array(optionCount).fill(0),
            myVote: null,
          };

          if (existing.myVote === optionIndex) {
            return state;
          }

          const counts = [...existing.counts];

          if (existing.myVote !== null) {
            counts[existing.myVote] = Math.max(0, counts[existing.myVote] - 1);
          }

          counts[optionIndex] = (counts[optionIndex] ?? 0) + 1;

          return {
            pollVotes: {
              ...state.pollVotes,
              [messageId]: { counts, myVote: optionIndex },
            },
          };
        });
      },

      leaveChat: async (chatId) => {
        const hasSession = useSessionStore.getState().hasSession;

        if (!hasSession) {
          return;
        }

        const previousThreads = get().threads;
        set((state) => ({ threads: state.threads.filter((thread) => thread.id !== chatId) }));

        try {
          await api.leaveChatThread(chatId);
        } catch {
          set({ threads: previousThreads, error: "Couldn't leave the chat. Try again." });
          throw new Error("Couldn't leave the chat. Try again.");
        }
      },

      markThreadRead: (chatId) => {
        set((state) => ({
          threads: state.threads.map((thread) =>
            thread.id === chatId && thread.unreadCount > 0
              ? { ...thread, unreadCount: 0 }
              : thread,
          ),
        }));

        const hasSession = useSessionStore.getState().hasSession;

        if (hasSession) {
          api.markChatThreadRead(chatId).catch(() => {});
        }
      },

      dismissError: () => set({ error: null }),
    }),
    {
      name: 'retalk-chats',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        threads: state.threads,
        hasLoaded: state.hasLoaded,
        pollVotes: state.pollVotes,
      }),
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
