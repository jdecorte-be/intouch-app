import { describe, expect, it } from 'vitest';

import { buildLocationMessageText, parseLocationFromText } from '@/lib/location-share';
import { buildPollMessageText, parsePollFromText } from '@/lib/poll';
import { buildReplyMessageText, parseReplyFromText, summarizeMessageForReply } from '@/lib/reply';
import type { ChatMessage } from '@/lib/types';
import { extractYouTubeVideoId } from '@/lib/youtube';

const baseMessage: ChatMessage = {
  id: 'm1',
  author: 'Maya',
  authorImage: null,
  fromSelf: false,
  text: 'hello',
  sentAt: '2026-09-24T18:00:00Z',
};

describe('polls', () => {
  it('round-trips a poll through message text', () => {
    const text = buildPollMessageText('Pizza or tacos?', ['Pizza', 'Tacos']);

    expect(parsePollFromText(text)).toEqual({ question: 'Pizza or tacos?', options: ['Pizza', 'Tacos'] });
  });

  it('ignores normal messages and corrupt payloads', () => {
    expect(parsePollFromText('just chatting')).toBeNull();
    expect(parsePollFromText('POLL_DATA::{oops')).toBeNull();
    expect(parsePollFromText('POLL_DATA::{"question":1,"options":[]}')).toBeNull();
  });
});

describe('location sharing', () => {
  it('round-trips coordinates, including negatives', () => {
    const text = buildLocationMessageText(43.6532, -79.3832);

    expect(parseLocationFromText(text)).toEqual({ latitude: 43.6532, longitude: -79.3832 });
  });

  it('returns null when there is no map link', () => {
    expect(parseLocationFromText('meet at the fountain')).toBeNull();
  });
});

describe('replies', () => {
  it('round-trips the reply preview and body', () => {
    const text = buildReplyMessageText({ author: 'Maya', text: 'see you there' }, 'same!');

    expect(parseReplyFromText(text)).toEqual({
      reply: { author: 'Maya', text: 'see you there', image: null },
      text: 'same!',
    });
  });

  it('keeps multi-line reply bodies intact', () => {
    const text = buildReplyMessageText({ author: 'A', text: 'x' }, 'line one\nline two');

    expect(parseReplyFromText(text)?.text).toBe('line one\nline two');
  });

  it('returns null for plain text and malformed payloads', () => {
    expect(parseReplyFromText('hello')).toBeNull();
    expect(parseReplyFromText('REPLY_DATA::not json\nbody')).toBeNull();
  });

  it('summarizes special messages for the reply banner', () => {
    expect(summarizeMessageForReply({ ...baseMessage, image: 'https://x/y.png' })).toBe('📷 Photo');
    expect(summarizeMessageForReply({ ...baseMessage, text: buildPollMessageText('Q?', ['a', 'b']) })).toBe('📊 Q?');
    expect(summarizeMessageForReply({ ...baseMessage, text: buildLocationMessageText(1, 2) })).toBe('📍 Location');
    expect(summarizeMessageForReply(baseMessage)).toBe('hello');
  });

  it('summarizes the body of a reply, not its marker', () => {
    const text = buildReplyMessageText({ author: 'A', text: 'x' }, 'the actual text');

    expect(summarizeMessageForReply({ ...baseMessage, text })).toBe('the actual text');
  });
});

describe('extractYouTubeVideoId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['check this https://youtube.com/shorts/dQw4w9WgXcQ out', 'dQw4w9WgXcQ'],
  ])('finds the id in %s', (text, id) => {
    expect(extractYouTubeVideoId(text)).toBe(id);
  });

  it('returns null when there is no video link', () => {
    expect(extractYouTubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });
});
