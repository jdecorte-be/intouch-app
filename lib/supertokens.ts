import SuperTokens from 'supertokens-react-native';

import { API_BASE_URL } from '@/lib/config';

let initialized = false;

// Patches the global fetch so every request to API_BASE_URL automatically
// carries/refreshes the SuperTokens session, this must run before any
// other code in the app calls fetch() against the API.
export function initSuperTokens() {
  if (initialized) {
    return;
  }

  SuperTokens.init({
    apiDomain: API_BASE_URL,
    apiBasePath: '/auth',
  });

  initialized = true;
}
