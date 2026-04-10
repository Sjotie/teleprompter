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
    // Skipping "world" and going straight to "how" — within default N=5.
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

  test("does not advance beyond lookahead window", () => {
    const tokens = tokenize("one two three four five six seven eight")
    // At -1, speaking "seven" (index 6, distance 7) is beyond N=5 window.
    expect(findNextMatch(tokens, -1, ["seven"])).toBe(-1)
  })
})
