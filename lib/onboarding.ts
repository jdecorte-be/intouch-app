import type { SessionUser } from './types';

export type OnboardingProfileChanges = Pick<
  SessionUser,
  | 'name'
  | 'age'
  | 'gender'
  | 'languagesSpoken'
  | 'image'
  | 'photos'
  | 'homeNeighborhood'
  | 'homeCoordinates'
  | 'eventInterests'
>;

export function isOnboardingProfileComplete(user: SessionUser) {
  return Boolean(
    user.name.trim() &&
      user.age &&
      user.gender &&
      user.languagesSpoken.length > 0 &&
      user.image &&
      user.homeNeighborhood?.trim() &&
      user.eventInterests.length > 0,
  );
}

export function shouldShowOnboarding(
  user: SessionUser | null,
  completedOnboardingUserIds: string[],
) {
  if (!user) {
    return false;
  }

  // The database's onboardingCompletedAt is the source of truth — it's set
  // by the backend the moment onboarding is submitted, so it survives
  // reinstalls and devices where local storage doesn't persist (Expo Go and
  // web fall back to in-memory storage; see lib/storage.ts). The local id
  // list is only a fallback for the offline test-sign-in user, which has no
  // backend record to carry the flag.
  if (user.onboardingCompletedAt) {
    return false;
  }

  if (completedOnboardingUserIds.includes(user.id)) {
    return false;
  }

  return !isOnboardingProfileComplete(user);
}
