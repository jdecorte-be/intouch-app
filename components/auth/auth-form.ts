export type AuthMode = 'login' | 'register';

export type AuthFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export const authCopy = {
  login: {
    title: 'Login Now To Your Account.',
    description: 'Access your account to manage settings, explore events, and stay in touch.',
    submit: 'Login',
    footerText: "Don't have an account?",
    footerLink: 'Sign Up',
  },
  register: {
    title: 'Create Your Account.',
    description: 'Sign up to start discovering events and staying in touch with your people.',
    submit: 'Create account',
    footerText: 'Already have an account?',
    footerLink: 'Login',
  },
} as const;

export function getRequestedAuthMode(mode: string | undefined, fallback: AuthMode) {
  return mode === 'login' || mode === 'register' ? mode : fallback;
}

export function getAuthValidationError(mode: AuthMode, values: AuthFormValues) {
  if (mode === 'register' && !values.name.trim()) {
    return 'Enter your name to continue.';
  }

  if (!values.email.trim() || !values.password) {
    return 'Enter your email and password to continue.';
  }

  if (mode === 'register' && values.password.length < 8) {
    return 'Use a password with at least 8 characters.';
  }

  if (mode === 'register' && values.password !== values.confirmPassword) {
    return 'The passwords you entered do not match.';
  }

  return null;
}
