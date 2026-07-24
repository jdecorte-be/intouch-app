import { parseLocationFromText } from '@/lib/location-share';
import { parsePollFromText } from '@/lib/poll';
import type { ChatMessage } from '@/lib/types';

const REPLY_MARKER = 'REPLY_DATA::';

export type ReplyPreview = {
  author: string;
  text: string;
  image?: string | null;
};

export function summarizeMessageForReply(message: ChatMessage): string {
  if (message.image) {
    return '📷 Photo';
  }

  const inner = parseReplyFromText(message.text);
  const bodyText = inner ? inner.text : message.text;

  const poll = parsePollFromText(bodyText);
  if (poll) {
    return `📊 ${poll.question}`;
  }

  const location = parseLocationFromText(bodyText);
  if (location) {
    return '📍 Location';
  }

  return bodyText;
}

export function buildReplyMessageText(reply: ReplyPreview, messageText: string): string {
  return `${REPLY_MARKER}${JSON.stringify(reply)}\n${messageText}`;
}

export function parseReplyFromText(text: string): { reply: ReplyPreview; text: string } | null {
  if (!text.startsWith(REPLY_MARKER)) {
    return null;
  }

  const newlineIndex = text.indexOf('\n');
  const jsonPart = newlineIndex === -1 ? text.slice(REPLY_MARKER.length) : text.slice(REPLY_MARKER.length, newlineIndex);
  const rest = newlineIndex === -1 ? '' : text.slice(newlineIndex + 1);

  try {
    const payload = JSON.parse(jsonPart);

    if (!payload || typeof payload.author !== 'string' || typeof payload.text !== 'string') {
      return null;
    }

    return { reply: { author: payload.author, text: payload.text, image: payload.image ?? null }, text: rest };
  } catch {
    return null;
  }
}
