import { describe, expect, it } from 'vitest';

import { getAuthValidationError, getRequestedAuthMode, type AuthFormValues } from '@/components/auth/auth-form';
import { isValidAge, steps } from '@/components/onboarding/onboarding-steps';
import { extractYouTubeVideoId, youTubeEmbedUrl, youTubeThumbnailUrl } from '@/lib/youtube';

const valid: AuthFormValues = {
  name: 'Ada',
  email: 'ada@example.com',
  password: 'longenough',
  confirmPassword: 'longenough',
};

describe('getRequestedAuthMode', () => {
  it('accepts known modes', () => {
    expect(getRequestedAuthMode('login', 'register')).toBe('login');
    expect(getRequestedAuthMode('register', 'login')).toBe('register');
  });

  it.each([undefined, '', 'admin'])('falls back for %j', (mode) => {
    expect(getRequestedAuthMode(mode, 'login')).toBe('login');
  });
});

describe('getAuthValidationError', () => {
  it('accepts valid input in both modes', () => {
    expect(getAuthValidationError('register', valid)).toBeNull();
    expect(getAuthValidationError('login', { ...valid, name: '', confirmPassword: '' })).toBeNull();
  });

  it('requires a name only when registering', () => {
    expect(getAuthValidationError('register', { ...valid, name: '  ' })).toMatch(/name/i);
    expect(getAuthValidationError('login', { ...valid, name: '' })).toBeNull();
  });

  it('requires email and password', () => {
    expect(getAuthValidationError('login', { ...valid, email: ' ' })).toMatch(/email and password/i);
    expect(getAuthValidationError('login', { ...valid, password: '' })).toMatch(/email and password/i);
  });

  it('enforces password length and confirmation on register only', () => {
    expect(getAuthValidationError('register', { ...valid, password: 'short', confirmPassword: 'short' })).toMatch(
      /8 characters/,
    );
    expect(getAuthValidationError('register', { ...valid, confirmPassword: 'different1' })).toMatch(/do not match/);
    expect(getAuthValidationError('login', { ...valid, password: 'short', confirmPassword: 'x' })).toBeNull();
  });
});

describe('isValidAge', () => {
  it.each(['13', '25', '110', ' 30 '])('accepts %j', (age) => {
    expect(isValidAge(age)).toBe(true);
  });

  it.each(['', '  ', 'abc', '12', '111', '-5'])('rejects %j', (age) => {
    expect(isValidAge(age)).toBe(false);
  });
});

describe('onboarding steps', () => {
  it('has unique keys in the expected order', () => {
    expect(steps.map((s) => s.key)).toEqual(['profile', 'languages', 'photos', 'interests', 'location']);
  });
});

describe('YouTube URL builders', () => {
  it('builds thumbnail and embed urls', () => {
    expect(youTubeThumbnailUrl('abcdefghijk')).toBe('https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg');
    expect(youTubeEmbedUrl('abcdefghijk')).toBe('https://www.youtube.com/embed/abcdefghijk?autoplay=1&playsinline=1');
  });

  it('round-trips an id extracted from a share link', () => {
    const id = extractYouTubeVideoId('watch https://youtu.be/dQw4w9WgXcQ now');

    expect(id).toBe('dQw4w9WgXcQ');
    expect(youTubeEmbedUrl(id!)).toContain('/embed/dQw4w9WgXcQ');
  });
});
