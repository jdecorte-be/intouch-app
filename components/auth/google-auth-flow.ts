import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { AuthApiError, getGoogleAuthorisationUrl } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';
import { GoogleSignInCancelledError, signInWithGoogleNatively } from '@/lib/google-signin';
import { canUseNativeModules } from '@/lib/runtime';

const GOOGLE_AUTH_DEEP_LINK = 'intouchapp://auth-callback';
// Google's OAuth client only accepts https redirect URIs, so it can't land
// straight on the app's intouchapp:// deep link. The backend exposes a bridge
// route that Google may redirect to; it forwards the callback query params to
// GOOGLE_AUTH_DEEP_LINK with a real HTTP redirect, which openAuthSessionAsync
// below is watching for.
const GOOGLE_AUTH_REDIRECT_URL = `${API_BASE_URL}/auth/mobile-callback`;

type GoogleAuthActions = {
  completeGoogleAuth: (
    code: string,
    state: string | null,
    redirectURIOnProviderDashboard: string,
    pkceCodeVerifier?: string,
  ) => Promise<void>;
  completeGoogleAuthWithIdToken: (idToken: string) => Promise<void>;
};

// Resolves to true once the user is signed in, or false if they backed out.
// Any other failure is thrown for the caller to display.
export async function runGoogleSignIn(actions: GoogleAuthActions): Promise<boolean> {
  // Android gets Google's own native sign-in sheet when running in a dev or
  // standalone build. Expo Go can't load the native module, so it uses the
  // browser flow below, like iOS.
  if (Platform.OS === 'android' && canUseNativeModules) {
    try {
      await actions.completeGoogleAuthWithIdToken(await signInWithGoogleNatively());

      return true;
    } catch (err) {
      if (err instanceof GoogleSignInCancelledError) {
        return false;
      }

      throw err;
    }
  }

  // SuperTokens' thirdparty flow: the backend owns the Google client id and
  // secret, so ask it for the authorisation URL, send the user through it, then
  // hand the callback's code and state back to finish the sign-in.
  const { url: authorisationUrl, pkceCodeVerifier } = await getGoogleAuthorisationUrl(GOOGLE_AUTH_REDIRECT_URL);
  const result = await WebBrowser.openAuthSessionAsync(authorisationUrl, GOOGLE_AUTH_DEEP_LINK);

  if (result.type !== 'success' || !result.url) {
    return false;
  }

  const { searchParams } = new URL(result.url);
  const oauthError = searchParams.get('error');

  if (oauthError) {
    throw new AuthApiError(oauthError);
  }

  const code = searchParams.get('code');

  if (!code) {
    throw new AuthApiError('NoSession');
  }

  await actions.completeGoogleAuth(code, searchParams.get('state'), GOOGLE_AUTH_REDIRECT_URL, pkceCodeVerifier);

  return true;
}
