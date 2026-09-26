import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionUser } from '@/lib/types';

vi.mock('@/lib/storage', async () => (await import('./helpers/session-mock')).storageMock);
vi.mock('supertokens-react-native', () => ({ default: { signOut: vi.fn(() => Promise.resolve()) } }));
vi.mock('@/lib/api', () => ({
  fetchSession: vi.fn(),
  fetchMe: vi.fn(),
  signInWithCredentials: vi.fn(),
  registerWithCredentials: vi.fn(),
  completeGoogleSignIn: vi.fn(),
  completeGoogleSignInWithIdToken: vi.fn(),
  completeOnboarding: vi.fn(),
}));
vi.mock('@/stores/chat-store', () => ({ useChatStore: { getState: () => ({ reset: chatReset }) } }));
vi.mock('@/stores/notifications-store', () => ({
  useNotificationsStore: { getState: () => ({ reset: notificationsReset }) },
}));
vi.mock('@/stores/events-store', () => ({
  useEventsStore: { getState: () => ({ clearInterests: clearInterests }) },
}));

const { chatReset, notificationsReset, clearInterests } = vi.hoisted(() => ({
  chatReset: vi.fn(),
  notificationsReset: vi.fn(),
  clearInterests: vi.fn(),
}));

import SuperTokens from 'supertokens-react-native';

import * as api from '@/lib/api';
import { useSessionStore } from '@/stores/session-store';

function makeUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: 'u1',
    name: 'Ada',
    email: 'ada@example.com',
    age: null,
    gender: null,
    languagesSpoken: [],
    image: null,
    photos: [],
    homeNeighborhood: null,
    homeCoordinates: null,
    eventInterests: [],
    eventGoals: [],
    memberSince: '2026',
    onboardingCompletedAt: null,
    ...overrides,
  } as SessionUser;
}

const state = () => useSessionStore.getState();
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.fetchMe).mockResolvedValue({} as never);
  useSessionStore.setState({
    user: null,
    hasSession: false,
    isLoading: false,
    hasSeenWelcome: false,
    completedOnboardingUserIds: [],
    profileOverrides: {},
    hostedEvents: [],
    hostedGroups: [],
    interestedEvents: [],
    interestedGroups: [],
  });
});

describe('sign in / register', () => {
  it('signIn stores the user and refreshes activity', async () => {
    vi.mocked(api.signInWithCredentials).mockResolvedValue(makeUser());
    await state().signIn('ada@example.com', 'pw');

    expect(state()).toMatchObject({ hasSession: true, user: { id: 'u1' } });
    expect(api.fetchMe).toHaveBeenCalled();
  });

  it('register and google flows set the session', async () => {
    vi.mocked(api.registerWithCredentials).mockResolvedValue(makeUser({ id: 'r' }));
    await state().register('Ada', 'a@b.c', 'pw');
    expect(state().user?.id).toBe('r');

    vi.mocked(api.completeGoogleSignInWithIdToken).mockResolvedValue(makeUser({ id: 'g' }));
    await state().completeGoogleAuthWithIdToken('tok');
    expect(state().user?.id).toBe('g');
  });

  it('completeGoogleAuth omits state when null and forwards the pkce verifier', async () => {
    vi.mocked(api.completeGoogleSignIn).mockResolvedValue(makeUser());
    await state().completeGoogleAuth('code', null, 'redirect', 'verifier');

    expect(api.completeGoogleSignIn).toHaveBeenCalledWith('redirect', { code: 'code' }, 'verifier');
  });

  it('propagates auth failures without changing state', async () => {
    vi.mocked(api.signInWithCredentials).mockRejectedValue(new Error('bad'));

    await expect(state().signIn('a', 'b')).rejects.toThrow('bad');
    expect(state().hasSession).toBe(false);
  });

  it('applies saved profile overrides on sign in', async () => {
    useSessionStore.setState({ profileOverrides: { u1: { name: 'Custom' } } });
    vi.mocked(api.signInWithCredentials).mockResolvedValue(makeUser());
    await state().signIn('a', 'b');

    expect(state().user?.name).toBe('Custom');
  });
});

describe('loadSession', () => {
  it('does nothing without a session', async () => {
    await state().loadSession();
    expect(api.fetchSession).not.toHaveBeenCalled();
  });

  it('fetches the user when a session exists but nothing is cached', async () => {
    useSessionStore.setState({ hasSession: true });
    vi.mocked(api.fetchSession).mockResolvedValue(makeUser());
    await state().loadSession();

    expect(state()).toMatchObject({ isLoading: false, hasSession: true, user: { id: 'u1' } });
  });

  it('keeps the cached user and revalidates in the background', async () => {
    useSessionStore.setState({ hasSession: true, user: makeUser({ name: 'Old' }) });
    let resolveFresh!: (user: SessionUser) => void;
    vi.mocked(api.fetchSession).mockReturnValue(new Promise((resolve) => (resolveFresh = resolve)));
    await state().loadSession();
    expect(state().user?.name).toBe('Old');

    resolveFresh(makeUser({ name: 'Fresh' }));
    await flush();
    expect(state().user?.name).toBe('Fresh');
  });

  it('signs out locally when the server says the session is gone', async () => {
    useSessionStore.setState({ hasSession: true, user: makeUser() });
    vi.mocked(api.fetchSession).mockResolvedValue(null);
    await state().loadSession();
    await flush();

    expect(state()).toMatchObject({ user: null, hasSession: false });
  });

  it('keeps the cached session when offline', async () => {
    useSessionStore.setState({ hasSession: true, user: makeUser() });
    vi.mocked(api.fetchSession).mockRejectedValue(new Error('offline'));
    await state().loadSession();
    await flush();

    expect(state().hasSession).toBe(true);
    expect(state().user).not.toBeNull();
  });

  it('stops loading on failure of the first fetch', async () => {
    useSessionStore.setState({ hasSession: true });
    vi.mocked(api.fetchSession).mockRejectedValue(new Error('offline'));
    await state().loadSession();

    expect(state().isLoading).toBe(false);
  });
});

describe('profile', () => {
  it('updateProfile merges into user and overrides', () => {
    useSessionStore.setState({ user: makeUser() });
    state().updateProfile({ name: 'New' });

    expect(state().user?.name).toBe('New');
    expect(state().profileOverrides.u1).toEqual({ name: 'New' });
  });

  it('updateProfile is a no-op without a user', () => {
    state().updateProfile({ name: 'New' });
    expect(state().profileOverrides).toEqual({});
  });
});

describe('completeOnboarding', () => {
  const changes = { name: 'Ada L', languagesSpoken: ['en'] } as never;

  it('does nothing without a user', async () => {
    await state().completeOnboarding(changes);
    expect(api.completeOnboarding).not.toHaveBeenCalled();
  });

  it('stays local for the session-less test user', async () => {
    useSessionStore.setState({ user: makeUser(), hasSession: false });
    await state().completeOnboarding(changes);

    expect(api.completeOnboarding).not.toHaveBeenCalled();
    expect(state().completedOnboardingUserIds).toEqual(['u1']);
    expect(state().user?.name).toBe('Ada L');
  });

  it('persists to the backend for real accounts without duplicating ids', async () => {
    useSessionStore.setState({ user: makeUser(), hasSession: true, completedOnboardingUserIds: ['u1'] });
    vi.mocked(api.completeOnboarding).mockResolvedValue(makeUser({ onboardingCompletedAt: 'now' }));
    await state().completeOnboarding(changes);

    expect(state().completedOnboardingUserIds).toEqual(['u1']);
    expect(state().user).toMatchObject({ name: 'Ada L', onboardingCompletedAt: 'now' });
    expect(state().profileOverrides.u1).toMatchObject({ name: 'Ada L' });
  });
});

describe('refreshMyActivity and signOut', () => {
  it('stores activity from the API and tolerates failure', async () => {
    useSessionStore.setState({ hasSession: true });
    vi.mocked(api.fetchMe).mockResolvedValueOnce({ hostedEvents: [{ id: 'h' }] } as never);
    await state().refreshMyActivity();
    expect(state().hostedEvents).toHaveLength(1);

    vi.mocked(api.fetchMe).mockRejectedValueOnce(new Error('x'));
    await expect(state().refreshMyActivity()).resolves.toBeUndefined();
    expect(state().hostedEvents).toHaveLength(1);
  });

  it('signOut clears per-user data and calls SuperTokens for real sessions', async () => {
    useSessionStore.setState({ user: makeUser(), hasSession: true, hostedEvents: [{ id: 'h' } as never] });
    await state().signOut();

    expect(SuperTokens.signOut).toHaveBeenCalled();
    expect(chatReset).toHaveBeenCalled();
    expect(notificationsReset).toHaveBeenCalled();
    expect(clearInterests).toHaveBeenCalled();
    expect(state()).toMatchObject({ user: null, hasSession: false, hostedEvents: [] });
  });

  it('signOut skips SuperTokens for the local user', async () => {
    useSessionStore.setState({ user: makeUser(), hasSession: false });
    await state().signOut();

    expect(SuperTokens.signOut).not.toHaveBeenCalled();
  });
});
