import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import type { Token } from "@/lib/tokenize"

type Props = {
  tokens: Token[]
  currentIndex: number
}

/**
 * Renders a script as a sequence of word spans, highlighting the word
 * the user is *about to read* (not the one just spoken). Auto-scrolls the
 * active word to sit at ~30% from the top of the scroll container so there
 * is plenty of upcoming text visible below it.
 */
export function ScriptDisplay({ tokens, currentIndex }: Props) {
  const activeRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    // Instant (not smooth) scroll — smooth animations stack up when speech
    // recognition fires rapid updates, and the highlight transition itself
    // already provides visual feedback for the motion.
    activeRef.current?.scrollIntoView({
      block: "start",
      behavior: "auto",
    })
  }, [currentIndex])

  if (tokens.length === 0) {
    return (
      <p className="text-center text-zinc-500 italic">
        No script yet — head back to the editor.
      </p>
    )
  }

  return (
    <p className="font-serif text-[3rem] leading-[1.7] tracking-tight">
      {tokens.map((token, i) => {
        const isActive = i === currentIndex
        const isPast = i < currentIndex
        return (
          <span
            key={i}
            ref={isActive ? activeRef : null}
            data-index={i}
            style={
              isActive
                ? { textShadow: "0 0 24px rgba(253, 224, 71, 0.45)" }
                : undefined
            }
            className={cn(
              "mr-[0.28em] inline-block scroll-mt-[30vh] transition-[color,opacity] duration-150 last:mr-0",
              isPast && "text-zinc-600/40",
              isActive && "text-yellow-200",
              !isPast && !isActive && "text-zinc-100",
            )}
          >
            {token.text}
          </span>
        )
      })}
    </p>
  )
}
