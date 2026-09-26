import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatMessage, ChatThread } from '@/lib/types';

import { sessionState } from './helpers/session-mock';

vi.mock('@/lib/storage', async () => (await import('./helpers/session-mock')).storageMock);
vi.mock('@/stores/session-store', async () => (await import('./helpers/session-mock')).sessionStoreMock);
vi.mock('@/lib/api', () => ({
  fetchChatThreads: vi.fn(),
  fetchChatThread: vi.fn(),
  joinEventChat: vi.fn(),
  startDirectChat: vi.fn(),
  sendChatMessage: vi.fn(),
  toggleChatMessageReaction: vi.fn(),
  leaveChatThread: vi.fn(),
  markChatThreadRead: vi.fn(() => Promise.resolve()),
}));

import * as api from '@/lib/api';
import { selectSubscribedEventIds, selectUnreadCount, useChatStore } from '@/stores/chat-store';

function message(id: string, overrides: Partial<ChatMessage> = {}): ChatMessage {
  return { id, author: 'Ada', authorImage: null, fromSelf: false, text: id, sentAt: '1:00 PM', ...overrides };
}

function thread(id: string, overrides: Partial<ChatThread> = {}): ChatThread {
  return {
    id,
    kind: 'direct',
    title: id,
    subtitle: '',
    accent: '#000',
    initials: 'X',
    unreadCount: 0,
    participants: [],
    participantCount: 0,
    messages: [],
    ...overrides,
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const state = () => useChatStore.getState();

beforeEach(() => {
  vi.clearAllMocks();
  sessionState.hasSession = true;
  state().reset();
});

describe('loadThreads', () => {
  it('merges fetched threads with local ones', async () => {
    useChatStore.setState({ threads: [thread('local')] });
    vi.mocked(api.fetchChatThreads).mockResolvedValue([thread('remote')]);

    await state().loadThreads();

    expect(state().threads.map((t) => t.id).sort()).toEqual(['local', 'remote']);
    expect(state().hasLoaded).toBe(true);
  });

  it('keeps cached messages when the refreshed thread has messages too', async () => {
    useChatStore.setState({ threads: [thread('a', { messages: [message('cached')] })] });
    vi.mocked(api.fetchChatThreads).mockResolvedValue([thread('a', { messages: [message('new')] })]);

    await state().loadThreads();

    expect(state().threads[0].messages.map((m) => m.id)).toEqual(['cached']);
  });

  it('sets an error on first-load failure only', async () => {
    vi.mocked(api.fetchChatThreads).mockRejectedValue(new Error('x'));
    await state().loadThreads();
    expect(state().error).toMatch(/load chats/);

    state().dismissError();
    useChatStore.setState({ hasLoaded: true });
    await state().loadThreads();
    expect(state().error).toBeNull();
  });

  it('does not hit the network without a session', async () => {
    sessionState.hasSession = false;
    await state().loadThreads();

    expect(api.fetchChatThreads).not.toHaveBeenCalled();
    expect(state().hasLoaded).toBe(true);
  });
});

describe('loadThreadMessages', () => {
  it('replaces messages with the server copy', async () => {
    useChatStore.setState({ threads: [thread('a', { messages: [message('old')] })] });
    vi.mocked(api.fetchChatThread).mockResolvedValue(thread('a', { messages: [message('fresh')] }));

    await state().loadThreadMessages('a');

    expect(state().threads[0].messages.map((m) => m.id)).toEqual(['fresh']);
  });

  it('keeps cached messages on failure', async () => {
    useChatStore.setState({ threads: [thread('a', { messages: [message('old')] })] });
    vi.mocked(api.fetchChatThread).mockRejectedValue(new Error('x'));

    await state().loadThreadMessages('a');

    expect(state().threads[0].messages.map((m) => m.id)).toEqual(['old']);
  });
});

describe('joinEventChat / startDirectChat', () => {
  const event = { id: 'ev1' } as never;

  it('reuses an existing event thread', async () => {
    useChatStore.setState({ threads: [thread('t1', { kind: 'event', eventId: 'ev1' })] });

    await expect(state().joinEventChat(event)).resolves.toBe('t1');
    expect(api.joinEventChat).not.toHaveBeenCalled();
  });

  it('joins via the api and stores the thread', async () => {
    vi.mocked(api.joinEventChat).mockResolvedValue(thread('t2', { kind: 'event', eventId: 'ev1' }));

    await expect(state().joinEventChat(event)).resolves.toBe('t2');
    expect(state().threads).toHaveLength(1);
  });

  it('requires a session', async () => {
    sessionState.hasSession = false;

    await expect(state().joinEventChat(event)).rejects.toThrow(/sign in/);
    await expect(state().startDirectChat('Bo', 'u2')).rejects.toThrow(/sign in/);
  });

  it('starts a direct chat', async () => {
    vi.mocked(api.startDirectChat).mockResolvedValue(thread('d1'));

    await expect(state().startDirectChat('Bo', 'u2', 'ev1')).resolves.toBe('d1');
    expect(api.startDirectChat).toHaveBeenCalledWith('Bo', 'u2', 'ev1');
  });
});

describe('sendMessage', () => {
  beforeEach(() => {
    useChatStore.setState({ threads: [thread('a'), thread('b')] });
  });

  it('adds an optimistic message, moves the thread first, then swaps in the confirmed one', async () => {
    vi.mocked(api.sendChatMessage).mockResolvedValue(message('server-1', { fromSelf: true }));

    state().sendMessage('b', 'hi', 'Me');

    expect(state().threads[0].id).toBe('b');
    expect(state().threads[0].messages[0]).toMatchObject({ text: 'hi', fromSelf: true, authorId: 'me' });

    await flush();
    expect(state().threads[0].messages.map((m) => m.id)).toEqual(['server-1']);
  });

  it('rolls back and reports an error when the send fails', async () => {
    vi.mocked(api.sendChatMessage).mockRejectedValue(new Error('x'));

    state().sendMessage('a', 'hi', 'Me');
    await flush();

    expect(state().threads.find((t) => t.id === 'a')?.messages).toEqual([]);
    expect(state().error).toMatch(/didn't send/);
  });

  it('rolls back immediately without a session', () => {
    sessionState.hasSession = false;
    state().sendMessage('a', 'hi', 'Me');

    expect(api.sendChatMessage).not.toHaveBeenCalled();
    expect(state().threads.find((t) => t.id === 'a')?.messages).toEqual([]);
    expect(state().error).toBeTruthy();
  });
});

describe('toggleReaction', () => {
  const setup = (reactions?: ChatMessage['reactions']) =>
    useChatStore.setState({ threads: [thread('a', { messages: [message('m', { reactions })] })] });
  const reactions = () => state().threads[0].messages[0].reactions;

  it('adds a new reaction optimistically', () => {
    setup();
    vi.mocked(api.toggleChatMessageReaction).mockReturnValue(new Promise(() => {}));
    state().toggleReaction('a', 'm', '👍');

    expect(reactions()).toEqual([{ emoji: '👍', count: 1, reactedByMe: true }]);
  });

  it('increments an existing reaction from someone else', () => {
    setup([{ emoji: '👍', count: 2, reactedByMe: false }]);
    vi.mocked(api.toggleChatMessageReaction).mockReturnValue(new Promise(() => {}));
    state().toggleReaction('a', 'm', '👍');

    expect(reactions()).toEqual([{ emoji: '👍', count: 3, reactedByMe: true }]);
  });

  it('removes my reaction when it was the only one', () => {
    setup([{ emoji: '👍', count: 1, reactedByMe: true }]);
    vi.mocked(api.toggleChatMessageReaction).mockReturnValue(new Promise(() => {}));
    state().toggleReaction('a', 'm', '👍');

    expect(reactions()).toEqual([]);
  });

  it('reverts on failure', async () => {
    const before = [{ emoji: '👍', count: 1, reactedByMe: true }];
    setup(before);
    vi.mocked(api.toggleChatMessageReaction).mockRejectedValue(new Error('x'));
    state().toggleReaction('a', 'm', '👍');
    await flush();

    expect(reactions()).toEqual(before);
    expect(state().error).toMatch(/reaction/);
  });

  it('applies the server-confirmed reactions', async () => {
    setup();
    const confirmed = [{ emoji: '👍', count: 5, reactedByMe: true }];
    vi.mocked(api.toggleChatMessageReaction).mockResolvedValue(message('m', { reactions: confirmed }));
    state().toggleReaction('a', 'm', '👍');
    await flush();

    expect(reactions()).toEqual(confirmed);
  });

  it('is a no-op without a session', () => {
    sessionState.hasSession = false;
    setup();
    state().toggleReaction('a', 'm', '👍');

    expect(reactions()).toBeUndefined();
  });
});

describe('votePoll', () => {
  it('records a vote and moves it when changed', () => {
    state().votePoll('p', 0, 3);
    expect(state().pollVotes.p).toEqual({ counts: [1, 0, 0], myVote: 0 });

    state().votePoll('p', 2, 3);
    expect(state().pollVotes.p).toEqual({ counts: [0, 0, 1], myVote: 2 });
  });

  it('ignores repeating the same vote', () => {
    state().votePoll('p', 1, 2);
    const before = state().pollVotes;
    state().votePoll('p', 1, 2);

    expect(state().pollVotes).toBe(before);
  });
});

describe('leaveChat', () => {
  beforeEach(() => useChatStore.setState({ threads: [thread('a'), thread('b')] }));

  it('removes the thread', async () => {
    vi.mocked(api.leaveChatThread).mockResolvedValue(undefined as never);
    await state().leaveChat('a');

    expect(state().threads.map((t) => t.id)).toEqual(['b']);
  });

  it('restores the thread and throws on failure', async () => {
    vi.mocked(api.leaveChatThread).mockRejectedValue(new Error('x'));

    await expect(state().leaveChat('a')).rejects.toThrow(/leave/);
    expect(state().threads).toHaveLength(2);
    expect(state().error).toBeTruthy();
  });
});

describe('markThreadRead and selectors', () => {
  it('zeros unread and syncs to the server', () => {
    useChatStore.setState({ threads: [thread('a', { unreadCount: 3 }), thread('b', { unreadCount: 2 })] });
    state().markThreadRead('a');

    expect(selectUnreadCount(state())).toBe(2);
    expect(api.markChatThreadRead).toHaveBeenCalledWith('a');
  });

  it('selects subscribed event ids from event threads only', () => {
    useChatStore.setState({
      threads: [
        thread('a', { kind: 'event', eventId: 'e1' }),
        thread('b', { kind: 'direct', eventId: 'e2' }),
        thread('c', { kind: 'event' }),
      ],
    });

    expect([...selectSubscribedEventIds(state())]).toEqual(['e1']);
  });
});
