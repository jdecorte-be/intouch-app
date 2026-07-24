import SuperTokens from 'supertokens-react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import * as api from '@/lib/api';
import type { OnboardingProfileChanges } from '@/lib/onboarding';
import { zustandStorage } from '@/lib/storage';
import type { EventItem, SessionUser } from '@/lib/types';

type ProfileOverrides = Record<string, Partial<SessionUser>>;

type SessionState = {
  user: SessionUser | null;
  // Whether `user` is backed by a real SuperTokens session (vs. the local,
  // token-less test user) — SuperTokens manages the actual session tokens
  // itself, so the app never sees or stores them directly.
  hasSession: boolean;
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
  completeGoogleAuth: (
    code: string,
    state: string | null,
    redirectURIOnProviderDashboard: string,
  ) => Promise<void>;
  completeOnboarding: (changes: OnboardingProfileChanges) => Promise<void>;
  updateProfile: (changes: Partial<SessionUser>) => void;
  refreshMyActivity: () => Promise<void>;
  signOut: () => Promise<void>;
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
      hasSession: false,
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

        const { hasSession, user } = get();

        if (!hasSession) {
          return;
        }

        if (user) {
          // Already have a cached session — revalidate in the background so
          // startup never blocks on a network round trip.
          void api
            .fetchSession()
            .then((freshUser) => {
              if (!freshUser) {
                set({ user: null, hasSession: false });
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
          const freshUser = await api.fetchSession();
          set({
            user: freshUser ? applyProfileOverrides(freshUser, get().profileOverrides) : null,
            hasSession: Boolean(freshUser),
            isLoading: false,
          });
          void get().refreshMyActivity();
        } catch {
          set({ isLoading: false });
        }
      },

      signIn: async (email, password) => {
        const user = await api.signInWithCredentials(email, password);
        set({ hasSession: true, user: applyProfileOverrides(user, get().profileOverrides) });
        void get().refreshMyActivity();
      },

      testSignIn: () => {
        set({
          hasSession: false,
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
          hasSession: false,
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
        const user = await api.registerWithCredentials(name, email, password);
        set({ hasSession: true, user: applyProfileOverrides(user, get().profileOverrides) });
        void get().refreshMyActivity();
      },

      completeGoogleAuth: async (code, state, redirectURIOnProviderDashboard) => {
        const user = await api.completeGoogleSignIn(redirectURIOnProviderDashboard, {
          code,
          ...(state ? { state } : {}),
        });
        set({ hasSession: true, user: applyProfileOverrides(user, get().profileOverrides) });
        void get().refreshMyActivity();
      },

      completeOnboarding: async (changes) => {
        const { user, hasSession } = get();

        if (!user) {
          return;
        }

        const completedOnboardingUserIds = get().completedOnboardingUserIds.includes(user.id)
          ? get().completedOnboardingUserIds
          : [...get().completedOnboardingUserIds, user.id];

        // Real accounts persist onboarding to the backend (onboardingCompletedAt),
        // so completion survives reinstalls and devices where local storage
        // doesn't stick (Expo Go/web fall back to in-memory storage). The
        // session-less local test user has no backend record, so it only gets
        // the local completedOnboardingUserIds fallback.
        if (!hasSession) {
          get().updateProfile(changes);
          set({ completedOnboardingUserIds });
          return;
        }

        const updatedUser = await api.completeOnboarding(changes);
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
        if (!get().hasSession) {
          return;
        }

        try {
          const activity = await api.fetchMe();
          set(activity);
        } catch {
          // Keep whatever activity data is already cached; the profile
          // screen just won't reflect the latest hosted/interested lists.
        }
      },

      signOut: async () => {
        if (get().hasSession) {
          await SuperTokens.signOut().catch(() => {});
        }

        set({
          user: null,
          hasSession: false,
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
        hasSession: state.hasSession,
        completedOnboardingUserIds: state.completedOnboardingUserIds,
        profileOverrides: state.profileOverrides,
      }),
    },
  ),
);
