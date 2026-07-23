import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import * as api from '@/lib/api';
import type { OnboardingProfileChanges } from '@/lib/onboarding';
import { zustandStorage } from '@/lib/storage';
import type { EventItem, SessionUser } from '@/lib/types';

type ProfileOverrides = Record<string, Partial<SessionUser>>;

type SessionState = {
  user: SessionUser | null;
  token: string | null;
  isLoading: boolean;
  completedOnboardingUserIds: string[];
  profileOverrides: ProfileOverrides;
  hostedEvents: EventItem[];
  hostedGroups: EventItem[];
  interestedEvents: EventItem[];
  interestedGroups: EventItem[];
  loadSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  testSignIn: () => void;
  testSignInForOnboarding: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  completeGoogleAuth: (token: string) => Promise<void>;
  completeOnboarding: (changes: OnboardingProfileChanges) => Promise<void>;
  updateProfile: (changes: Partial<SessionUser>) => void;
  refreshMyActivity: () => Promise<void>;
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
  age: 27,
  gender: 'prefer-not-to-say',
  languagesSpoken: ['English'],
  image: null,
  photos: [],
  homeNeighborhood: 'Queen West',
  homeCoordinates: null,
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
      hostedEvents: [],
      hostedGroups: [],
      interestedEvents: [],
      interestedGroups: [],

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
          void get().refreshMyActivity();

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
          void get().refreshMyActivity();
        } catch {
          set({ isLoading: false });
        }
      },

      signIn: async (email, password) => {
        const { token, user } = await api.signInWithCredentials(email, password);
        set({ token, user: applyProfileOverrides(user, get().profileOverrides) });
        void get().refreshMyActivity();
      },

      testSignIn: () => {
        set({
          token: null,
          user: applyProfileOverrides(testUser, get().profileOverrides),
          completedOnboardingUserIds: get().completedOnboardingUserIds.includes(testUser.id)
            ? get().completedOnboardingUserIds
            : [...get().completedOnboardingUserIds, testUser.id],
          hostedEvents: [],
          hostedGroups: [],
          interestedEvents: [],
          interestedGroups: [],
        });
      },

      // Debug-only helper (see the "Debug: test onboarding" button on the
      // login screen) that drops the test user back to a blank, incomplete
      // profile so the onboarding flow can be replayed on demand instead of
      // only being reachable once, on a brand-new account.
      testSignInForOnboarding: () => {
        const { [testUser.id]: _removedOverride, ...remainingOverrides } = get().profileOverrides;

        set({
          token: null,
          user: {
            ...testUser,
            name: '',
            age: null,
            gender: null,
            languagesSpoken: [],
            image: null,
            photos: [],
            homeNeighborhood: null,
            homeCoordinates: null,
            eventInterests: [],
            onboardingCompletedAt: null,
          },
          profileOverrides: remainingOverrides,
          completedOnboardingUserIds: get().completedOnboardingUserIds.filter((id) => id !== testUser.id),
          hostedEvents: [],
          hostedGroups: [],
          interestedEvents: [],
          interestedGroups: [],
        });
      },

      register: async (name, email, password) => {
        const { token, user } = await api.registerWithCredentials(name, email, password);
        set({ token, user: applyProfileOverrides(user, get().profileOverrides) });
        void get().refreshMyActivity();
      },

      completeGoogleAuth: async (token) => {
        const { token: sessionToken, user } = await api.completeGoogleSignIn(token);
        set({ token: sessionToken, user: applyProfileOverrides(user, get().profileOverrides) });
        void get().refreshMyActivity();
      },

      completeOnboarding: async (changes) => {
        const { user, token } = get();

        if (!user) {
          return;
        }

        const completedOnboardingUserIds = get().completedOnboardingUserIds.includes(user.id)
          ? get().completedOnboardingUserIds
          : [...get().completedOnboardingUserIds, user.id];

        // Real accounts persist onboarding to the backend (onboardingCompletedAt),
        // so completion survives reinstalls and devices where local storage
        // doesn't stick (Expo Go/web fall back to in-memory storage). The
        // token-less local test user has no backend record, so it only gets
        // the local completedOnboardingUserIds fallback.
        if (!token) {
          get().updateProfile(changes);
          set({ completedOnboardingUserIds });
          return;
        }

        const updatedUser = await api.completeOnboarding(token, changes);
        const profileOverrides = {
          ...get().profileOverrides,
          [user.id]: { ...get().profileOverrides[user.id], ...changes },
        };

        set({
          user: applyProfileOverrides(updatedUser, profileOverrides),
          profileOverrides,
          completedOnboardingUserIds,
        });
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

      refreshMyActivity: async () => {
        const token = get().token;

        if (!token) {
          return;
        }

        try {
          const activity = await api.fetchMe(token);
          set(activity);
        } catch {
          // Keep whatever activity data is already cached; the profile
          // screen just won't reflect the latest hosted/interested lists.
        }
      },

      signOut: () => {
        const token = get().token;

        if (token) {
          void api.signOutRemote(token);
        }

        set({
          user: null,
          token: null,
          hostedEvents: [],
          hostedGroups: [],
          interestedEvents: [],
          interestedGroups: [],
        });
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
