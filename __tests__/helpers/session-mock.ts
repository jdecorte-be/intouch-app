import { vi } from 'vitest';

// Shared through globalThis so state survives vi.resetModules() re-imports.
type SessionState = { hasSession: boolean; user: { id: string } | null };
const shared = globalThis as unknown as { __sessionState?: SessionState };
shared.__sessionState ??= { hasSession: true, user: { id: 'me' } };

export const sessionState = shared.__sessionState;

export const sessionStoreMock = {
  useSessionStore: { getState: () => sessionState },
};

const sharedStorage = globalThis as unknown as {
  __storageFns?: { set: ReturnType<typeof vi.fn>; getString: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
};
sharedStorage.__storageFns ??= { set: vi.fn(), getString: vi.fn(), remove: vi.fn() };

export const storageMock = {
  storage: sharedStorage.__storageFns,
  zustandStorage: {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  },
};
