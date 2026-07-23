const POLL_MARKER = 'POLL_DATA::';

export type PollPayload = {
  question: string;
  options: string[];
};

export function buildPollMessageText(question: string, options: string[]): string {
  const payload: PollPayload = { question, options };

  return `📊 ${question}\n${POLL_MARKER}${JSON.stringify(payload)}`;
}

export function parsePollFromText(text: string): PollPayload | null {
  const markerIndex = text.indexOf(POLL_MARKER);

  if (markerIndex === -1) {
    return null;
  }

  try {
    const payload = JSON.parse(text.slice(markerIndex + POLL_MARKER.length));

    if (!payload || typeof payload.question !== 'string' || !Array.isArray(payload.options)) {
      return null;
    }

    return { question: payload.question, options: payload.options };
  } catch {
    return null;
  }
}
