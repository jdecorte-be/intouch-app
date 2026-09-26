// JSON is not automatically safe inside a <script> block: a title containing
// "</script>" would end the block early. Escaping "<" keeps the payload inert.
export function toScriptJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
