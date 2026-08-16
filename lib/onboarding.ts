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

// A user has finished onboarding once either the backend has stamped
// onboardingCompletedAt (real accounts) or their id is in the local
// completedOnboardingUserIds fallback (session-less test user, or a real
// account that just finished onboarding in this session before the
// server response round-tripped).
export function hasCompletedOnboarding(
  user: Pick<SessionUser, 'id' | 'onboardingCompletedAt'> | null,
  completedOnboardingUserIds: string[],
): boolean {
  if (!user) {
    return false;
  }

  return Boolean(user.onboardingCompletedAt) || completedOnboardingUserIds.includes(user.id);
}

