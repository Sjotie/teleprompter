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

  let listening = false

  recognition.onresult = (event) => {
    // Only process results from resultIndex onwards — these are the ones
    // that are new or have changed since the last event. Iterating from 0
    // every time causes brittle tracking when Chrome revises interim
    // results downward (e.g. a 5-word interim finalizes to 4 words), which
    // otherwise stalls the whole pipeline permanently.
    //
    // The matcher is monotonic (it never moves the pointer backwards), so
    // re-emitting words that have already been matched is harmless — the
    // fuzzy forward window simply ignores them.
    const words: string[] = []
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const alt = event.results[i][0]
      if (!alt) continue
      for (const raw of alt.transcript.split(/\s+/)) {
        const n = normalize(raw)
        if (n) words.push(n)
      }
    }
    if (words.length > 0) {
      if (import.meta.env.DEV) {
        console.debug("[speech] heard:", words.join(" "))
      }
      opts.onTranscript(words)
    }
  }

  recognition.onerror = (event) => {
    const err = event.error
    if (err === "not-allowed" || err === "service-not-allowed") {
      opts.onError("not-allowed")
    } else if (err === "language-not-supported") {
      opts.onError("language-not-supported")
    } else if (err === "no-speech") {
      // Don't surface this as a blocking error — Chrome fires it after
      // every pause. Let onend handle the restart.
    } else if (err === "aborted") {
      // Same — aborted often fires during normal operation.
    } else if (err === "network") {
      opts.onError("network")
    } else {
      opts.onError("unknown")
    }
  }

  recognition.onend = () => {
    if (listening) {
      // Chrome's continuous mode ends itself periodically (after ~20-60s
      // or on a pause). Restart — but defer slightly so the state machine
      // has time to transition, otherwise recognition.start() throws
      // InvalidStateError.
      setTimeout(() => {
        if (!listening) return
        try {
          recognition.start()
        } catch {
          // If it still fails, bail out cleanly.
          listening = false
          opts.onStatusChange?.(false)
        }
      }, 100)
    } else {
      opts.onStatusChange?.(false)
    }
  }

  return {
    start: () => {
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
