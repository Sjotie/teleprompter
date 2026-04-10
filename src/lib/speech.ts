import { normalize } from "./normalize"

type RecognizerOptions = {
  lang: string
  onTranscript: (words: string[]) => void
  onError: (error: SpeechRecognitionErrorKind) => void
  onStatusChange?: (listening: boolean) => void
}

export type SpeechRecognitionErrorKind =
  | "not-supported"
  | "not-allowed"
  | "language-not-supported"
  | "no-speech"
  | "aborted"
  | "network"
  | "unknown"

type BrowserSpeechRecognition = {
  new (): {
    lang: string
    continuous: boolean
    interimResults: boolean
    start: () => void
    stop: () => void
    abort: () => void
    onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> & { length: number } }) => void) | null
    onerror: ((event: { error: string }) => void) | null
    onend: (() => void) | null
  }
}

function getSpeechRecognition(): BrowserSpeechRecognition | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: BrowserSpeechRecognition
    webkitSpeechRecognition?: BrowserSpeechRecognition
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognition() !== null
}

/**
 * Creates a continuous, interim-results speech recognizer wrapped around
 * the browser's SpeechRecognition API. On each new final or interim
 * result, extracts newly spoken words since the previous emit, normalizes
 * them with the shared normalize() helper, and pushes them to
 * onTranscript as a string[].
 */
export function createRecognizer(opts: RecognizerOptions) {
  const Ctor = getSpeechRecognition()
  if (!Ctor) {
    opts.onError("not-supported")
    return { start: () => {}, stop: () => {} }
  }

  const recognition = new Ctor()
  recognition.lang = opts.lang
  recognition.continuous = true
  recognition.interimResults = true

  let lastEmittedWordCount = 0
  let listening = false

  recognition.onresult = (event) => {
    // Collect every word across all results so far.
    const all: string[] = []
    for (let i = 0; i < event.results.length; i++) {
      const alternative = event.results[i][0]
      if (!alternative) continue
      const words = alternative.transcript
        .split(/\s+/)
        .map(normalize)
        .filter((w) => w.length > 0)
      all.push(...words)
    }
    // Emit only the newly added words since the last emit.
    if (all.length > lastEmittedWordCount) {
      const fresh = all.slice(lastEmittedWordCount)
      lastEmittedWordCount = all.length
      opts.onTranscript(fresh)
    }
  }

  recognition.onerror = (event) => {
    const err = event.error
    if (err === "not-allowed" || err === "service-not-allowed") {
      opts.onError("not-allowed")
    } else if (err === "language-not-supported") {
      opts.onError("language-not-supported")
    } else if (err === "no-speech") {
      opts.onError("no-speech")
    } else if (err === "aborted") {
      opts.onError("aborted")
    } else if (err === "network") {
      opts.onError("network")
    } else {
      opts.onError("unknown")
    }
  }

  recognition.onend = () => {
    if (listening) {
      // Unexpected end — auto-restart once.
      try {
        recognition.start()
      } catch {
        listening = false
        opts.onStatusChange?.(false)
      }
    } else {
      opts.onStatusChange?.(false)
    }
  }

  return {
    start: () => {
      lastEmittedWordCount = 0
      listening = true
      try {
        recognition.start()
        opts.onStatusChange?.(true)
      } catch {
        listening = false
        opts.onStatusChange?.(false)
        opts.onError("unknown")
      }
    },
    stop: () => {
      listening = false
      try {
        recognition.stop()
      } catch {
        // no-op
      }
      opts.onStatusChange?.(false)
    },
  }
}
