import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationItem } from '@/lib/types';

import { sessionState } from './helpers/session-mock';

vi.mock('@/lib/storage', async () => (await import('./helpers/session-mock')).storageMock);
vi.mock('@/stores/session-store', async () => (await import('./helpers/session-mock')).sessionStoreMock);
vi.mock('@/lib/api', () => ({
  fetchNotifications: vi.fn(),
  markNotificationRead: vi.fn(() => Promise.resolve()),
  markAllNotificationsRead: vi.fn(() => Promise.resolve()),
}));

import * as api from '@/lib/api';
import { selectUnreadNotificationCount, useNotificationsStore } from '@/stores/notifications-store';

function item(id: string, unread = true): NotificationItem {
  return {
    id,
    actor: 'Ada',
    time: 'now',
    title: 't',
    unread,
    kind: 'invite',
    icon: 'bell' as never,
    iconColor: '#000',
    iconBackground: '#fff',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionState.hasSession = true;
  useNotificationsStore.getState().reset();
});

describe('loadNotifications', () => {
  it('fetches and stores notifications once', async () => {
    vi.mocked(api.fetchNotifications).mockResolvedValue([item('1'), item('2', false)]);

    await useNotificationsStore.getState().loadNotifications();
    await useNotificationsStore.getState().loadNotifications();

    expect(api.fetchNotifications).toHaveBeenCalledTimes(1);
    expect(useNotificationsStore.getState().notifications).toHaveLength(2);
    expect(selectUnreadNotificationCount(useNotificationsStore.getState())).toBe(1);
  });

  it('skips the network without a session', async () => {
    sessionState.hasSession = false;
    await useNotificationsStore.getState().loadNotifications();

    expect(api.fetchNotifications).not.toHaveBeenCalled();
    expect(useNotificationsStore.getState().hasLoaded).toBe(true);
  });

  it('marks loaded even when the request fails', async () => {
    vi.mocked(api.fetchNotifications).mockRejectedValue(new Error('offline'));
    await useNotificationsStore.getState().loadNotifications();

    expect(useNotificationsStore.getState()).toMatchObject({ hasLoaded: true, notifications: [] });
  });
});

describe('read state', () => {
  beforeEach(() => {
    useNotificationsStore.setState({ notifications: [item('1'), item('2')], hasLoaded: true });
  });

  it('markRead updates one item and tells the server', () => {
    useNotificationsStore.getState().markRead('1');

    expect(selectUnreadNotificationCount(useNotificationsStore.getState())).toBe(1);
    expect(api.markNotificationRead).toHaveBeenCalledWith('1');
  });

  it('markRead stays local without a session', () => {
    sessionState.hasSession = false;
    useNotificationsStore.getState().markRead('1');

    expect(api.markNotificationRead).not.toHaveBeenCalled();
  });

  it('markAllRead clears every unread item', () => {
    useNotificationsStore.getState().markAllRead();

    expect(selectUnreadNotificationCount(useNotificationsStore.getState())).toBe(0);
    expect(api.markAllNotificationsRead).toHaveBeenCalled();
  });

  it('respondToInvite records the status and marks read', () => {
    useNotificationsStore.getState().respondToInvite('2', 'accepted' as never);

    expect(useNotificationsStore.getState().notifications[1]).toMatchObject({
      unread: false,
      inviteStatus: 'accepted',
    });
  });
});
