import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import * as api from '@/lib/api';
import type { OnboardingProfileChanges } from '@/lib/onboarding';
import { zustandStorage } from '@/lib/storage';
import type { SessionUser } from '@/lib/types';

type ProfileOverrides = Record<string, Partial<SessionUser>>;

type SessionState = {
  user: SessionUser | null;
  token: string | null;
  isLoading: boolean;
  completedOnboardingUserIds: string[];
  profileOverrides: ProfileOverrides;
  loadSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  testSignIn: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  completeGoogleAuth: (token: string) => Promise<void>;
  completeOnboarding: (changes: OnboardingProfileChanges) => void;
  updateProfile: (changes: Partial<SessionUser>) => void;
  signOut: () => void;
};

function applyProfileOverrides(user: SessionUser | null, overrides: ProfileOverrides) {
  if (!user) {
    return null;
  }

  return { ...user, ...overrides[user.id] };
}

const testUser: SessionUser = {
  id: 'test-user-local',
  name: 'Test User',
  email: 'test@retalk.local',
  image: null,
  homeNeighborhood: 'Queen West',
  eventInterests: ['social', 'art', 'party'],
  eventGoals: ['meet-new-people', 'go-out-tonight'],
  memberSince: 'July 2026',
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      completedOnboardingUserIds: [],
      profileOverrides: {},

      loadSession: async () => {
        if (get().isLoading) {
          return;
        }

        const { token, user } = get();

        if (!token) {
          return;
        }

        if (user) {
          // Already have a cached session — revalidate in the background so
          // startup never blocks on a network round trip.
          void api
            .fetchSession(token)
            .then((freshUser) => {
              if (!freshUser) {
                set({ user: null, token: null });
              } else {
                set({ user: applyProfileOverrides(freshUser, get().profileOverrides) });
              }
            })
            .catch(() => {});

          return;
        }

        set({ isLoading: true });

        try {
          const freshUser = await api.fetchSession(token);
          set({
            user: applyProfileOverrides(freshUser, get().profileOverrides),
            token: freshUser ? token : null,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
        }
      },

      signIn: async (email, password) => {
        const { token, user } = await api.signInWithCredentials(email, password);
        set({ token, user: applyProfileOverrides(user, get().profileOverrides) });
      },

      testSignIn: () => {
        set({
          token: null,
          user: applyProfileOverrides(testUser, get().profileOverrides),
          completedOnboardingUserIds: get().completedOnboardingUserIds.includes(testUser.id)
            ? get().completedOnboardingUserIds
            : [...get().completedOnboardingUserIds, testUser.id],
        });
      },

      register: async (name, email, password) => {
        const { token, user } = await api.registerWithCredentials(name, email, password);
        set({ token, user: applyProfileOverrides(user, get().profileOverrides) });
      },

      completeGoogleAuth: async (token) => {
        const { token: sessionToken, user } = await api.completeGoogleSignIn(token);
        set({ token: sessionToken, user: applyProfileOverrides(user, get().profileOverrides) });
      },

      completeOnboarding: (changes) => {
        const user = get().user;

        if (!user) {
          return;
        }

        const completedOnboardingUserIds = get().completedOnboardingUserIds.includes(user.id)
          ? get().completedOnboardingUserIds
          : [...get().completedOnboardingUserIds, user.id];

        get().updateProfile(changes);
        set({ completedOnboardingUserIds });
      },

      updateProfile: (changes) => {
        const user = get().user;

        if (!user) {
          return;
        }

        set({
          user: { ...user, ...changes },
          profileOverrides: {
            ...get().profileOverrides,
            [user.id]: {
              ...get().profileOverrides[user.id],
              ...changes,
            },
          },
        });
      },

      signOut: () => {
        const token = get().token;

        if (token) {
          void api.signOutRemote(token);
        }

        set({ user: null, token: null });
      },
    }),
    {
      name: 'retalk-session',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        completedOnboardingUserIds: state.completedOnboardingUserIds,
        profileOverrides: state.profileOverrides,
      }),
    },
  ),
);
