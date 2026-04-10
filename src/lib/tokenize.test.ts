import { describe, test, expect } from "bun:test"
import { tokenize } from "./tokenize"

describe("tokenize", () => {
  test("splits on whitespace", () => {
    const result = tokenize("hello world")
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ text: "hello", normalized: "hello" })
    expect(result[1]).toEqual({ text: "world", normalized: "world" })
  })

  test("keeps punctuation in display text, strips from normalized", () => {
    const result = tokenize("don't stop, believing!")
    expect(result.map((t) => t.text)).toEqual([
      "don't",
      "stop,",
      "believing!",
    ])
    expect(result.map((t) => t.normalized)).toEqual([
      "dont",
      "stop",
      "believing",
    ])
  })

  test("empty string yields empty array", () => {
    expect(tokenize("")).toEqual([])
  })

  test("collapses extra whitespace", () => {
    const result = tokenize("  multiple   spaces  ")
    expect(result.map((t) => t.text)).toEqual(["multiple", "spaces"])
  })

  test("dutch diacritics normalize to ASCII", () => {
    const result = tokenize("één twee drie")
    expect(result.map((t) => t.normalized)).toEqual(["een", "twee", "drie"])
    expect(result[0].text).toBe("één")
  })

  test("german eszett maps to ss, umlauts strip", () => {
    const result = tokenize("schöne Grüße")
    expect(result.map((t) => t.normalized)).toEqual(["schone", "grusse"])
  })

  test("french accents strip", () => {
    const result = tokenize("café où forêt")
    expect(result.map((t) => t.normalized)).toEqual(["cafe", "ou", "foret"])
  })

  test("spanish tilde-n strips to n", () => {
    const result = tokenize("año niño")
    expect(result.map((t) => t.normalized)).toEqual(["ano", "nino"])
  })

  test("drops pure-punctuation tokens", () => {
    const result = tokenize("hello -- world")
    expect(result.map((t) => t.text)).toEqual(["hello", "world"])
  })
})
