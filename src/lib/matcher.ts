import type { Token } from "./tokenize"

/** How far ahead of the current pointer we look for a matching token. */
export const DEFAULT_LOOKAHEAD = 4

/** How far ahead we'll scan during a drift rescue (strong-signal match). */
export const RESCUE_LOOKAHEAD = 30

/** Minimum length for a word to count as a "content" word (rescue anchor). */
const CONTENT_WORD_MIN_LENGTH = 5

/**
 * Given the script tokens, the current pointer (-1 before the first
 * word, tokens.length-1 on the last word), and words the user just spoke,
 * return the new pointer.
 *
 * Two-tier strategy:
 *
 * 1. **Narrow fuzzy window.** For each spoken word, scan the next
 *    `lookahead` upcoming tokens for a normalized match. This handles
 *    normal reading flow with tolerance for stutters, filler words, and
 *    small skips.
 *
 * 2. **Drift rescue.** If the narrow pass made zero progress, fall back
 *    to a wider scan (`RESCUE_LOOKAHEAD` tokens) looking for either:
 *      - a **2-word consecutive phrase** from spokenWords where at least
 *        one word is ≥ 5 chars (filters out `of the`, `and a`, etc.), or
 *      - a **single content word** (≥ 5 chars) from spokenWords.
 *    Either signal is strong enough that a longer jump is unlikely to be
 *    a false positive. This rescues drift when recognition mis-hears or
 *    drops words and the speaker has gotten ahead of the pointer.
 *
 * The function is monotonic — it never returns a pointer less than
 * `currentIndex`.
 */
export function findNextMatch(
  tokens: Token[],
  currentIndex: number,
  spokenWords: string[],
  lookahead: number = DEFAULT_LOOKAHEAD,
): number {
  if (spokenWords.length === 0 || tokens.length === 0) return currentIndex

  let pointer = currentIndex

  // Tier 1: narrow fuzzy window, word-by-word
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

  if (pointer !== currentIndex) return pointer

  // Tier 2: drift rescue
  return driftRescue(tokens, currentIndex, spokenWords)
}

function driftRescue(
  tokens: Token[],
  currentIndex: number,
  spokenWords: string[],
): number {
  const scanStart = currentIndex + 1
  const scanEnd = Math.min(currentIndex + RESCUE_LOOKAHEAD, tokens.length - 1)
  if (scanStart > scanEnd) return currentIndex

  // 2a: two-word phrase anchor (at least one word is content-length)
  for (let k = 0; k < spokenWords.length - 1; k++) {
    const a = spokenWords[k]
    const b = spokenWords[k + 1]
    if (!a || !b) continue
    if (a.length < CONTENT_WORD_MIN_LENGTH && b.length < CONTENT_WORD_MIN_LENGTH)
      continue
    for (let j = scanStart; j < scanEnd; j++) {
      if (tokens[j].normalized === a && tokens[j + 1].normalized === b) {
        return j + 1
      }
    }
  }

  // 2b: single content word anchor
  for (const spoken of spokenWords) {
    if (!spoken || spoken.length < CONTENT_WORD_MIN_LENGTH) continue
    for (let j = scanStart; j <= scanEnd; j++) {
      if (tokens[j].normalized === spoken) {
        return j
      }
    }
  }

  return currentIndex
}
