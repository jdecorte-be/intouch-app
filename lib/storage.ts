import type { StateStorage } from 'zustand/middleware';

import { canUseNativeModules } from '@/lib/runtime';

// MMKV is a native module, so it is unavailable in Expo Go or on web.
// Fall back to in-memory storage there so the app still boots for previews.
type KeyValueStore = {
  set: (key: string, value: string) => void;
  getString: (key: string) => string | undefined;
  remove: (key: string) => void;
};

function createFallbackStore(): KeyValueStore {
  const memory = new Map<string, string>();

  return {
    set: (key, value) => void memory.set(key, value),
    getString: (key) => memory.get(key),
    remove: (key) => void memory.delete(key),
  };
}

function createStore(): KeyValueStore {
  if (!canUseNativeModules) {
    return createFallbackStore();
  }

  try {
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');

    return createMMKV({ id: 'retalk' });
  } catch (error) {
    console.warn('MMKV storage failed to initialize; falling back to in-memory storage.', error);

    return createFallbackStore();
  }
}

export const storage = createStore();

export const zustandStorage: StateStorage = {
  setItem: (name, value) => storage.set(name, value),
  getItem: (name) => storage.getString(name) ?? null,
  removeItem: (name) => storage.remove(name),
};
