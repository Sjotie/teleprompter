import type { Token } from "./tokenize"

/** How far ahead of the current pointer we look for a matching token. */
export const DEFAULT_LOOKAHEAD = 4

/**
 * Given the script tokens, the current pointer (-1 before the first
 * word, tokens.length-1 on the last word), and words the user just spoke,
 * return the new pointer.
 *
 * Strategy: fuzzy forward window. For each spoken word, scan the next
 * `lookahead` upcoming tokens for a match (normalized equality). If found,
 * jump the pointer to that token. This tolerates stutters, filler words,
 * and small skips, without leaping back on off-script noise.
 *
 * Returns `currentIndex` unchanged if nothing matches.
 */
export function findNextMatch(
  tokens: Token[],
  currentIndex: number,
  spokenWords: string[],
  lookahead: number = DEFAULT_LOOKAHEAD,
): number {
  let pointer = currentIndex
  for (const spoken of spokenWords) {
    if (!spoken) continue
    const windowEnd = Math.min(pointer + lookahead, tokens.length - 1)
    for (let i = pointer + 1; i <= windowEnd; i++) {
      if (tokens[i].normalized === spoken) {
        pointer = i
        break
      }
    }
  }
  return pointer
}
