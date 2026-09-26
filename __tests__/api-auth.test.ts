import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AuthApiError,
  completeGoogleSignIn,
  fetchEvents,
  fetchSession,
  getGoogleAuthorisationUrl,
  registerWithCredentials,
  requestPasswordReset,
  signInWithCredentials,
} from '@/lib/api';

const fetchMock = vi.fn();

function res(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => {
      if (body === undefined) throw new Error('no body');
      return body;
    },
  };
}

const serializedUser = {
  id: 'u1',
  name: null,
  email: 'ada.lovelace@example.com',
  image: null,
  homeNeighborhood: null,
  eventInterests: ['music'],
  eventGoals: [],
  memberSince: '2026',
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe('fetchEvents', () => {
  it('returns parsed events', async () => {
    fetchMock.mockResolvedValue(res([{ id: 'e' }]));
    await expect(fetchEvents()).resolves.toEqual([{ id: 'e' }]);
  });

  it('throws with the status on failure', async () => {
    fetchMock.mockResolvedValue(res({}, { ok: false, status: 503 }));
    await expect(fetchEvents()).rejects.toThrow(/503/);
  });
});

describe('fetchSession', () => {
  it('returns null on 401', async () => {
    fetchMock.mockResolvedValue(res({}, { ok: false, status: 401 }));
    await expect(fetchSession()).resolves.toBeNull();
  });

  it('throws on other failures so callers can keep the cached session', async () => {
    fetchMock.mockResolvedValue(res({}, { ok: false, status: 500 }));
    await expect(fetchSession()).rejects.toThrow(/500/);
  });

  it('normalizes the user, deriving a name from the email', async () => {
    fetchMock.mockResolvedValue(res({ user: serializedUser }));
    const user = await fetchSession();

    expect(user).toMatchObject({
      id: 'u1',
      name: 'ada.lovelace',
      age: null,
      languagesSpoken: [],
      photos: [],
      homeCoordinates: null,
      onboardingCompletedAt: null,
    });
  });

  it('returns null when the body has no user', async () => {
    fetchMock.mockResolvedValue(res({}));
    await expect(fetchSession()).resolves.toBeNull();
  });
});

describe('credential auth', () => {
  it('signs in then loads the session', async () => {
    fetchMock
      .mockResolvedValueOnce(res({ status: 'OK', user: { id: 'u1' } }))
      .mockResolvedValueOnce(res({ user: serializedUser }));

    const user = await signInWithCredentials('a@b.c', 'pw');

    expect(user.id).toBe('u1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/signin$/);
    expect(JSON.parse(init.body)).toEqual({
      formFields: [
        { id: 'email', value: 'a@b.c' },
        { id: 'password', value: 'pw' },
      ],
    });
  });

  it('registers via signup with the name field', async () => {
    fetchMock
      .mockResolvedValueOnce(res({ status: 'OK', user: { id: 'u1' } }))
      .mockResolvedValueOnce(res({ user: serializedUser }));

    await registerWithCredentials('Ada', 'a@b.c', 'pw');

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/signup$/);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).formFields[0]).toEqual({ id: 'name', value: 'Ada' });
  });

  it('maps known status codes to friendly messages', async () => {
    fetchMock.mockResolvedValue(res({ status: 'WRONG_CREDENTIALS_ERROR' }));

    await expect(signInWithCredentials('a', 'b')).rejects.toMatchObject({
      code: 'WRONG_CREDENTIALS_ERROR',
      message: expect.stringMatching(/incorrect/),
    });
  });

  it('surfaces field errors from the server', async () => {
    fetchMock.mockResolvedValue(res({ status: 'FIELD_ERROR', formFields: [{ id: 'email', error: 'Bad email' }] }));

    await expect(registerWithCredentials('a', 'b', 'c')).rejects.toMatchObject({
      code: 'FIELD_ERROR',
      message: 'Bad email',
    });
  });

  it('treats http errors and unreadable bodies as Unknown', async () => {
    fetchMock.mockResolvedValue(res(undefined, { ok: false, status: 500 }));

    const error = await signInWithCredentials('a', 'b').catch((e) => e);
    expect(error).toBeInstanceOf(AuthApiError);
    expect(error.code).toBe('Unknown');
  });

  it('reports NoSession when sign-in succeeds but no session appears', async () => {
    fetchMock
      .mockResolvedValueOnce(res({ status: 'OK', user: { id: 'u1' } }))
      .mockResolvedValueOnce(res({}, { ok: false, status: 401 }));

    await expect(signInWithCredentials('a', 'b')).rejects.toMatchObject({ code: 'NoSession' });
  });
});

describe('requestPasswordReset', () => {
  it('resolves on success', async () => {
    fetchMock.mockResolvedValue(res({ status: 'OK' }));
    await expect(requestPasswordReset('a@b.c')).resolves.toBeUndefined();
  });

  it('throws on field errors and http failures', async () => {
    fetchMock.mockResolvedValueOnce(res({ status: 'FIELD_ERROR', formFields: [{ error: 'nope' }] }));
    await expect(requestPasswordReset('x')).rejects.toThrow('nope');

    fetchMock.mockResolvedValueOnce(res({}, { ok: false, status: 500 }));
    await expect(requestPasswordReset('x')).rejects.toMatchObject({ code: 'Unknown' });
  });
});

describe('google auth', () => {
  it('returns the authorisation url and pkce verifier', async () => {
    fetchMock.mockResolvedValue(res({ status: 'OK', urlWithQueryParams: 'https://g/auth', pkceCodeVerifier: 'v' }));

    await expect(getGoogleAuthorisationUrl('app://cb?x=1')).resolves.toEqual({
      url: 'https://g/auth',
      pkceCodeVerifier: 'v',
    });
    expect(fetchMock.mock.calls[0][0]).toContain(encodeURIComponent('app://cb?x=1'));
  });

  it('reports OAuthNotConfigured when no url comes back', async () => {
    fetchMock.mockResolvedValue(res({ status: 'OK' }));
    await expect(getGoogleAuthorisationUrl('x')).rejects.toMatchObject({ code: 'OAuthNotConfigured' });
  });

  it('completes sign-in, only sending the pkce verifier when present', async () => {
    fetchMock.mockResolvedValue(res({ status: 'OK' }));
    fetchMock.mockResolvedValueOnce(res({ status: 'OK' })).mockResolvedValueOnce(res({ user: serializedUser }));

    await completeGoogleSignIn('redir', { code: 'c' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({
      thirdPartyId: 'google',
      redirectURIInfo: { redirectURIOnProviderDashboard: 'redir', redirectURIQueryParams: { code: 'c' } },
    });
  });

  it('propagates provider status codes', async () => {
    fetchMock.mockResolvedValue(res({ status: 'SIGN_IN_UP_NOT_ALLOWED' }));
    await expect(completeGoogleSignIn('r', {}, 'v')).rejects.toMatchObject({ code: 'SIGN_IN_UP_NOT_ALLOWED' });
  });
});
