import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ScriptDisplay } from "@/components/ScriptDisplay"
import { getLanguage } from "@/lib/languages"
import { tokenize } from "@/lib/tokenize"
import { findNextMatch } from "@/lib/matcher"
import {
  createRecognizer,
  isSpeechRecognitionSupported,
  type SpeechRecognitionErrorKind,
} from "@/lib/speech"
import { cn } from "@/lib/utils"

type Props = {
  script: string
  language: string
  onBack: () => void
}

type Recognizer = { start: () => void; stop: () => void }

const ERROR_MESSAGES: Record<SpeechRecognitionErrorKind, string> = {
  "not-supported":
    "Speech recognition isn't supported in this browser — open in Chrome or Edge.",
  "not-allowed":
    "Microphone access was blocked. Allow mic permissions for this site and retry.",
  "language-not-supported":
    "Your browser doesn't support recognition for this language. Try English.",
  "no-speech": "No speech detected — click the mic again when you're ready.",
  aborted: "Recognition was interrupted. Click the mic to resume.",
  network: "Network error reaching the speech service. Check your connection.",
  unknown: "Something went wrong with speech recognition.",
}

export function PerformView({ script, language, onBack }: Props) {
  const tokens = useMemo(() => tokenize(script), [script])
  const tokensRef = useRef(tokens)
  tokensRef.current = tokens

  // Two-stage pointer:
  // - targetIndex is "the word the speaker has reached" — updated
  //   instantly from speech recognition or manual nudges.
  // - currentIndex is "the word the display is currently showing" —
  //   walks smoothly toward targetIndex at a fixed rate so bursty
  //   multi-word recognition events don't cause visual leaps.
  const [targetIndex, setTargetIndex] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<SpeechRecognitionErrorKind | null>(null)
  const [heard, setHeard] = useState<string[]>([])
  const recognizerRef = useRef<Recognizer | null>(null)
  const supported = useMemo(() => isSpeechRecognitionSupported(), [])
  const lang = getLanguage(language)

  const clamp = useCallback((n: number) => {
    if (n < 0) return 0
    if (n > tokensRef.current.length) return tokensRef.current.length
    return n
  }, [])

  const nudge = useCallback(
    (delta: number) => {
      // Manual nudges move both pointers in lockstep — no smoothing,
      // the user expects an immediate response.
      setTargetIndex((i) => clamp(i + delta))
      setCurrentIndex((i) => clamp(i + delta))
    },
    [clamp],
  )
  const reset = useCallback(() => {
    setTargetIndex(0)
    setCurrentIndex(0)
  }, [])

  // Tick the display toward the target. 80 ms per word gives a smooth
  // word-by-word animation for normal reading, and we snap directly for
  // large gaps (> 6 words) so a fast reader doesn't accumulate lag.
  useEffect(() => {
    if (currentIndex === targetIndex) return
    const gap = Math.abs(targetIndex - currentIndex)
    if (gap > 6) {
      setCurrentIndex(targetIndex)
      return
    }
    const step = targetIndex > currentIndex ? 1 : -1
    const id = window.setTimeout(() => {
      setCurrentIndex((c) => c + step)
    }, 80)
    return () => window.clearTimeout(id)
  }, [targetIndex, currentIndex])

  const stopRecognizer = useCallback(() => {
    recognizerRef.current?.stop()
    recognizerRef.current = null
    setListening(false)
    setHeard([])
    // Sync target to wherever the display is so the next start is not
    // fighting a stale target.
    setTargetIndex(currentIndex)
  }, [currentIndex])

  const startRecognizer = useCallback(() => {
    if (!supported) {
      setError("not-supported")
      return
    }
    setError(null)
    const rec = createRecognizer({
      lang: language,
      onTranscript: (words) => {
        // Keep the last ~10 heard words visible as a debug readout.
        setHeard((prev) => [...prev, ...words].slice(-10))
        // The matcher operates on a "last matched" pointer. The target
        // tracks "next to read" — so feed it target-1 and add 1 back.
        setTargetIndex((t) => {
          const lastMatched = findNextMatch(
            tokensRef.current,
            t - 1,
            words,
          )
          return lastMatched + 1
        })
      },
      onError: (err) => {
        setError(err)
        if (err === "not-allowed" || err === "not-supported") {
          stopRecognizer()
        }
      },
      onStatusChange: (isListening) => {
        setListening(isListening)
      },
    })
    recognizerRef.current = rec
    rec.start()
  }, [language, supported, stopRecognizer])

  const toggleMic = useCallback(() => {
    if (listening) stopRecognizer()
    else startRecognizer()
  }, [listening, startRecognizer, stopRecognizer])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nudge(1)
      else if (e.key === "ArrowLeft") nudge(-1)
      else if (e.key === "r" || e.key === "R") reset()
      else if (e.key === "Escape") onBack()
      else if (e.key === " ") {
        e.preventDefault()
        toggleMic()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [nudge, reset, onBack, toggleMic])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stopRecognizer()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [stopRecognizer])

  useEffect(() => {
    // Stop recognizer on unmount and when language changes.
    return () => stopRecognizer()
  }, [language, stopRecognizer])

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#0a0a12] via-[#0d0a18] to-[#0a0a12]">
      <header className="flex items-center justify-between border-b border-zinc-900 bg-zinc-950/60 px-6 py-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
        >
          ← Editor
        </button>
        <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-400">
          <span>{lang.flag}</span>
          <span>{lang.label}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => nudge(-1)}
            className="rounded-md border border-zinc-800 px-3 py-1 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-100"
            aria-label="Previous word"
          >
            ←
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-zinc-800 px-3 py-1 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-100"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            className="rounded-md border border-zinc-800 px-3 py-1 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-100"
            aria-label="Next word"
          >
            →
          </button>
          <button
            type="button"
            onClick={toggleMic}
            disabled={!supported}
            className={cn(
              "ml-2 rounded-md border px-4 py-1 font-medium transition-all",
              listening
                ? "border-red-500/50 bg-red-500/10 text-red-400 shadow-[0_0_16px_rgba(239,68,68,0.3)]"
                : "border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20",
              !supported && "cursor-not-allowed opacity-40",
            )}
            aria-label={listening ? "Stop microphone" : "Start microphone"}
          >
            {listening ? "● Listening" : "🎙 Mic"}
          </button>
        </div>
      </header>

      {error && (
        <div className="border-b border-red-900/40 bg-red-950/30 px-6 py-3 text-center text-sm text-red-300">
          {ERROR_MESSAGES[error]}
        </div>
      )}

      {listening && (
        <div className="border-b border-zinc-900 bg-zinc-950/60 px-6 py-2 text-center font-mono text-xs text-zinc-500">
          <span className="mr-2 text-zinc-600">heard:</span>
          {heard.length === 0 ? (
            <span className="italic text-zinc-700">…waiting for speech…</span>
          ) : (
            heard.join(" ")
          )}
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-8 pt-[30vh] pb-[70vh]">
        <div className="mx-auto max-w-3xl text-center">
          <ScriptDisplay tokens={tokens} currentIndex={currentIndex} />
        </div>
      </main>

      <footer className="border-t border-zinc-900 bg-zinc-950/60 px-6 py-3 text-center text-xs text-zinc-600">
        Space: toggle mic · ← / → nudge · R reset · Esc exit
      </footer>
    </div>
  )
}
