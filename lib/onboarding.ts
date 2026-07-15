import type { SessionUser } from './types';

export type OnboardingProfileChanges = Pick<
  SessionUser,
  'name' | 'homeNeighborhood' | 'eventInterests' | 'eventGoals'
>;

export function isOnboardingProfileComplete(user: SessionUser) {
  return Boolean(
    user.name.trim() &&
      user.homeNeighborhood?.trim() &&
      user.eventInterests.length > 0 &&
      user.eventGoals.length > 0,
  );
}

export function shouldShowOnboarding(
  user: SessionUser | null,
  completedOnboardingUserIds: string[],
) {
  if (!user) {
    return false;
  }

  if (completedOnboardingUserIds.includes(user.id)) {
    return false;
  }

  return !isOnboardingProfileComplete(user);
}
