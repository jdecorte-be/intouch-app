export const MAX_GALLERY_PHOTOS = 6;

const MIN_AGE = 13;
const MAX_AGE = 110;

export type OnboardingStep = {
  key: 'profile' | 'languages' | 'photos' | 'interests' | 'location';
  eyebrow: string;
  title: string;
  description: string;
};

export const steps: OnboardingStep[] = [
  {
    key: 'profile',
    eyebrow: 'Profile',
    title: 'Start with the basics.',
    description: 'This is how other members will see you.',
  },
  {
    key: 'languages',
    eyebrow: 'Languages',
    title: 'Which languages do you speak?',
    description: "Pick every language you're comfortable chatting in. This helps us match you with the right people.",
  },
  {
    key: 'photos',
    eyebrow: 'Photos',
    title: 'Add a profile picture.',
    description: 'Choose a clear photo of yourself so people recognize you at events.',
  },
  {
    key: 'interests',
    eyebrow: 'Interests',
    title: 'Choose categories.',
    description: "Pick what excites you, and we'll surface more of it in your feed.",
  },
  {
    key: 'location',
    eyebrow: 'Location',
    title: 'Where are you based?',
    description: "Share your location so we can show you what's happening nearby, or pick a neighborhood manually.",
  },
];

export function isValidAge(ageText: string) {
  const age = Number.parseInt(ageText, 10);

  return ageText.trim().length > 0 && Number.isFinite(age) && age >= MIN_AGE && age <= MAX_AGE;
}
