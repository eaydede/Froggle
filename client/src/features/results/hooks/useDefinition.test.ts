import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupDefinition } from './useDefinition';

afterEach(() => vi.unstubAllGlobals());
describe('definition stem lookup', () => {
  it('tries the original word and then plural stems, retaining the matched title', async () => {
    const fetch = vi.fn(async (url: string) => new Response(url.endsWith('/scale')
      ? JSON.stringify({ word: 'scale', entries: [{ partOfSpeech: 'noun', senses: [{ definition: 'An ordered series.' }] }] }) : '', { status: url.endsWith('/scale') ? 200 : 404 }));
    vi.stubGlobal('fetch', fetch);
    const result = await lookupDefinition('scales', new AbortController().signal);
    expect(result?.word).toBe('scale');
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      'https://freedictionaryapi.com/api/v1/entries/en/scales',
      'https://api.dictionaryapi.dev/api/v2/entries/en/scales',
      'https://freedictionaryapi.com/api/v1/entries/en/scale',
    ]);
  });
  it('returns the empty state when no candidate exists and honours cancellation', async () => {
    const fetch = vi.fn(async () => new Response('', { status: 404 }));
    vi.stubGlobal('fetch', fetch);
    expect(await lookupDefinition('nothing', new AbortController().signal)).toBeNull();
    const controller = new AbortController(); controller.abort();
    await expect(lookupDefinition('scales', controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
