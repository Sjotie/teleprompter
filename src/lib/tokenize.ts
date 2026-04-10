import { normalize } from "./normalize"

export type Token = {
  /** Original text with punctuation preserved, used for display. */
  text: string
  /** Normalized form used for matching against recognized speech. */
  normalized: string
}

/**
 * Split a script into tokens, one per whitespace-separated word.
 * Punctuation stays attached to the displayed word but is stripped from
 * the normalized form. Tokens that normalize to an empty string (pure
 * punctuation) are dropped so they can't block the matcher.
 */
export function tokenize(script: string): Token[] {
  return script
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => ({ text: word, normalized: normalize(word) }))
    .filter((token) => token.normalized.length > 0)
}
