import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sessionState, storageMock } from './helpers/session-mock';

vi.mock('@/lib/storage', async () => (await import('./helpers/session-mock')).storageMock);
vi.mock('@/stores/session-store', async () => (await import('./helpers/session-mock')).sessionStoreMock);

const fetchMock = vi.fn();

async function loadKlipy(key: string | undefined) {
  vi.resetModules();
  if (key === undefined) {
    vi.stubEnv('EXPO_PUBLIC_KLIPY_API_KEY', '');
  } else {
    vi.stubEnv('EXPO_PUBLIC_KLIPY_API_KEY', key);
  }
  return import('@/lib/klipy');
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  sessionState.user = { id: 'me' };
  storageMock.storage.getString.mockReset();
  storageMock.storage.set.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('isKlipyConfigured', () => {
  it('reflects the api key', async () => {
    expect((await loadKlipy('k')).isKlipyConfigured()).toBe(true);
    expect((await loadKlipy(undefined)).isKlipyConfigured()).toBe(false);
  });
});

describe('fetching pages', () => {
  it('parses gif results, clamps aspect ratio and reports hasNext', async () => {
    const klipy = await loadKlipy('KEY');
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: {
          has_next: true,
          data: [
            {
              slug: 'wide',
              file: { sm: { gif: { url: 'sm.gif', width: 1000, height: 100 } }, md: { gif: { url: 'md.gif' } } },
            },
            { slug: 'no-preview', file: {} },
            { file: { sm: { gif: { url: 'x' } } } },
          ],
        },
      }),
    );

    const page = await klipy.fetchTrendingMedia('gifs', 2);

    expect(fetchMock).toHaveBeenCalledWith('https://api.klipy.com/api/v1/KEY/gifs/trending?page=2&per_page=30');
    expect(page.hasNext).toBe(true);
    expect(page.results).toEqual([{ id: 'wide', previewUrl: 'sm.gif', sendUrl: 'md.gif', aspectRatio: 1.6 }]);
  });

  it('parses the flatter clip shape', async () => {
    const klipy = await loadKlipy('KEY');
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: { data: [{ slug: 'c', file: { gif: 'c.gif' }, file_meta: { gif: { width: 100, height: 1000 } } }] },
      }),
    );

    const page = await klipy.fetchTrendingMedia('clips', 1);

    expect(page.results).toEqual([{ id: 'c', previewUrl: 'c.gif', sendUrl: 'c.gif', aspectRatio: 0.6 }]);
    expect(page.hasNext).toBe(false);
  });

  it('encodes search queries', async () => {
    const klipy = await loadKlipy('KEY');
    fetchMock.mockResolvedValue(jsonResponse({}));

    const page = await klipy.searchMedia('stickers', 'a b&c', 1);

    expect(fetchMock.mock.calls[0][0]).toContain('/stickers/search?q=a%20b%26c&page=1');
    expect(page).toEqual({ results: [], hasNext: false });
  });

  it('throws on http errors', async () => {
    const klipy = await loadKlipy('KEY');
    fetchMock.mockResolvedValue(jsonResponse({}, false, 500));

    await expect(klipy.fetchTrendingMedia('gifs', 1)).rejects.toThrow(/500/);
  });
});

describe('getKlipyCustomerId', () => {
  it('uses the session user id when signed in', async () => {
    expect((await loadKlipy('K')).getKlipyCustomerId()).toBe('me');
  });

  it('reuses a stored anonymous id', async () => {
    const klipy = await loadKlipy('K');
    sessionState.user = null;
    storageMock.storage.getString.mockReturnValue('stored-id');

    expect(klipy.getKlipyCustomerId()).toBe('stored-id');
    expect(storageMock.storage.set).not.toHaveBeenCalled();
  });

  it('generates and persists an id otherwise', async () => {
    const klipy = await loadKlipy('K');
    sessionState.user = null;
    storageMock.storage.getString.mockReturnValue(undefined);

    const id = klipy.getKlipyCustomerId();

    expect(id).toMatch(/^intouch-/);
    expect(storageMock.storage.set).toHaveBeenCalledWith('klipy-customer-id', id);
  });
});

describe('reportMediaShare', () => {
  it('posts the share with the customer id', async () => {
    const klipy = await loadKlipy('K');
    fetchMock.mockResolvedValue(jsonResponse({}));

    klipy.reportMediaShare('gifs', 'a/b');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.klipy.com/api/v1/K/gifs/share/a%2Fb');
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ customer_id: 'me' }) });
  });

  it('does nothing without an api key and swallows network errors', async () => {
    (await loadKlipy(undefined)).reportMediaShare('gifs', 's');
    expect(fetchMock).not.toHaveBeenCalled();

    const klipy = await loadKlipy('K');
    fetchMock.mockRejectedValue(new Error('offline'));
    expect(() => klipy.reportMediaShare('gifs', 's')).not.toThrow();
  });
});
