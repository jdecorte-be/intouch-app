import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import type { StateStorage } from 'zustand/middleware';

import { canUseNativeModules } from '@/lib/runtime';

// Persisted state (chats, profile) is stored in MMKV, encrypted with a key held
// in the OS keychain. MMKV is a native module, so it is unavailable in Expo Go
// or on web; those fall back to in-memory storage so the app still boots.
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

const ENCRYPTION_KEY_NAME = 'intouch-storage-key';
const LEGACY_CLEARED_FLAG = 'legacy-storage-cleared';
const KEY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// MMKV accepts encryption keys of up to 16 bytes, so use 16 characters from a
// 64-symbol alphabet (96 bits of randomness). 256 is divisible by 64, so
// masking a random byte keeps the distribution uniform.
function generateEncryptionKey() {
  const bytes = getRandomBytes(16);

  return Array.from(bytes, (byte) => KEY_ALPHABET[byte & 63]).join('');
}

// The key lives in the OS keychain/keystore, never next to the data it protects.
function getOrCreateEncryptionKey() {
  const options = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
  const existing = SecureStore.getItem(ENCRYPTION_KEY_NAME, options);

  if (existing) {
    return existing;
  }

  const created = generateEncryptionKey();
  SecureStore.setItem(ENCRYPTION_KEY_NAME, created, options);

  return created;
}

function createStore(): KeyValueStore {
  if (!canUseNativeModules) {
    return createFallbackStore();
  }

  try {
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    const encrypted = createMMKV({ id: 'intouch-secure', encryptionKey: getOrCreateEncryptionKey() });

    // Earlier builds wrote chats and profile data to an unencrypted store.
    if (!encrypted.getBoolean(LEGACY_CLEARED_FLAG)) {
      createMMKV({ id: 'retalk' }).clearAll();
      encrypted.set(LEGACY_CLEARED_FLAG, true);
    }

    return encrypted;
  } catch (error) {
    // Never fall back to plaintext on disk: keep data in memory instead.
    console.warn('Encrypted storage failed to initialize; using in-memory storage.', error);

    return createFallbackStore();
  }
}

export const storage = createStore();

export const zustandStorage: StateStorage = {
  setItem: (name, value) => storage.set(name, value),
  getItem: (name) => storage.getString(name) ?? null,
  removeItem: (name) => storage.remove(name),
};
