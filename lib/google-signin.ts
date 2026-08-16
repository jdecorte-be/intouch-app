import type * as GoogleSigninModule from '@react-native-google-signin/google-signin';

// Native Google Sign-In (Android only for now — see components/auth/auth-screen.tsx).
// webClientId must be the same "Web application" OAuth client the backend's
// SuperTokens ThirdParty(Google) recipe is configured with (AUTH_GOOGLE_ID in
// intouch-api), so the ID token this returns is audienced for a client the
// backend already trusts. The Android OAuth client registered in Google
// Cloud Console (matching this app's package name + signing certificate) is
// what actually authorizes the native sign-in call at the OS level — its id
// is never referenced here.

// This package registers a native module as soon as it's evaluated, which
// throws on any binary that hasn't been rebuilt with it yet (Expo Go, or a
// dev client from before this was added). auth-screen.tsx imports this file
// unconditionally on every platform, so a static top-level import would
// crash the whole auth screen instead of just the Android native path.
// require() it lazily, only once we're actually about to use it.
function loadGoogleSignin(): typeof GoogleSigninModule {
  return require('@react-native-google-signin/google-signin');
}

let configured = false;

function ensureConfigured() {
  if (configured) {
    return;
  }

  loadGoogleSignin().GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });

  configured = true;
}

export class GoogleSignInCancelledError extends Error {}

// Runs the native sign-in sheet and returns the ID token to hand to the
// backend's /auth/signinup (see lib/api.ts#completeGoogleSignInWithIdToken).
export async function signInWithGoogleNatively(): Promise<string> {
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = loadGoogleSignin();

  ensureConfigured();

  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response) || !response.data.idToken) {
      throw new GoogleSignInCancelledError();
    }

    return response.data.idToken;
  } catch (err) {
    if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new GoogleSignInCancelledError();
    }

    throw err;
  }
}
