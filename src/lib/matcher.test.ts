import { describe, test, expect } from "bun:test"
import { findNextMatch } from "./matcher"
import { tokenize } from "./tokenize"

describe("findNextMatch", () => {
  test("advances from -1 to first word on exact match", () => {
    const tokens = tokenize("hello world how are you")
    expect(findNextMatch(tokens, -1, ["hello"])).toBe(0)
  })

  test("advances one word at a time in sequence", () => {
    const tokens = tokenize("hello world how are you")
    expect(findNextMatch(tokens, 0, ["world"])).toBe(1)
    expect(findNextMatch(tokens, 1, ["how"])).toBe(2)
  })

  test("advances multiple words within a single transcript chunk", () => {
    const tokens = tokenize("hello world how are you")
    expect(findNextMatch(tokens, 0, ["world", "how", "are"])).toBe(3)
  })

  test("unchanged when no spoken word matches", () => {
    const tokens = tokenize("hello world")
    expect(findNextMatch(tokens, 0, ["banana"])).toBe(0)
  })

  test("tolerates a single skipped word inside the lookahead window", () => {
    const tokens = tokenize("hello world how are you")
    // Skipping "world" and going straight to "how" — within default N=4.
    expect(findNextMatch(tokens, 0, ["how"])).toBe(2)
  })

  test("does not leap backwards", () => {
    const tokens = tokenize("hello world how are you")
    // Already at "are" (index 3), speaking "hello" should stay at 3.
    expect(findNextMatch(tokens, 3, ["hello"])).toBe(3)
  })

  test("punctuation on script tokens is normalized away for matching", () => {
    const tokens = tokenize("hello, world!")
    expect(findNextMatch(tokens, -1, ["hello"])).toBe(0)
    expect(findNextMatch(tokens, 0, ["world"])).toBe(1)
  })

  test("diacritics on script tokens match bare spoken words", () => {
    const tokens = tokenize("één twee drie")
    expect(findNextMatch(tokens, -1, ["een"])).toBe(0)
    expect(findNextMatch(tokens, 0, ["twee"])).toBe(1)
  })

  test("reaching the last word returns the last index", () => {
    const tokens = tokenize("hello world")
    // At "hello" (0), speaking "world" should go to index 1 (last word).
    expect(findNextMatch(tokens, 0, ["world"])).toBe(1)
  })

  test("empty spokenWords returns currentIndex unchanged", () => {
    const tokens = tokenize("hello world")
    expect(findNextMatch(tokens, 1, [])).toBe(1)
  })

  test("does not advance beyond narrow window for single short word", () => {
    const tokens = tokenize("one two three four five six seven eight")
    // At -1, speaking "six" (3 chars, index 5) — too short for rescue,
    // too far for the narrow window (N=4). Stays put.
    expect(findNextMatch(tokens, -1, ["six"])).toBe(-1)
  })

  test("drift rescue: content word beyond narrow window", () => {
    // "teleprompter" is 11 tokens ahead — well beyond narrow N=4 — but
    // it's a content word (12 chars) so the rescue should jump.
    const tokens = tokenize(
      "the quick brown fox jumps over a lazy dog and a teleprompter",
    )
    expect(findNextMatch(tokens, -1, ["teleprompter"])).toBe(11)
  })

  test("drift rescue: two-word phrase with at least one content word", () => {
    // Narrow window fails for "new teleprompter", but the 2-word phrase
    // rescue catches it because "teleprompter" is a content word.
    const tokens = tokenize(
      "hello world this is just some filler before the new teleprompter app",
    )
    // At -1, with narrow N=4, nothing matches in tokens 0..3
    // ("hello","world","this","is"). Drift rescue scans for the phrase
    // and finds "new teleprompter" at indices 9,10 → pointer = 10.
    expect(findNextMatch(tokens, -1, ["new", "teleprompter"])).toBe(10)
  })

  test("drift rescue: short filler phrase does NOT trigger a jump", () => {
    // "of the" is two short words — rescue should not fire, even if
    // "of the" exists elsewhere in the script.
    const tokens = tokenize(
      "apple banana cherry one two three four five of the thing",
    )
    // Narrow window at -1 covers indices 0..3 (apple..one) — no match.
    // Rescue should not fire because neither "of" nor "the" is ≥5 chars.
    expect(findNextMatch(tokens, -1, ["of", "the"])).toBe(-1)
  })

  test("drift rescue: common short word does NOT jump alone", () => {
    const tokens = tokenize(
      "apple banana cherry one two three four five the end",
    )
    // "the" is 3 chars, not a content word, so no single-word rescue.
    expect(findNextMatch(tokens, -1, ["the"])).toBe(-1)
  })
})
