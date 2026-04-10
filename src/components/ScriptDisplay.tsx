import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import type { Token } from "@/lib/tokenize"

type Props = {
  tokens: Token[]
  currentIndex: number
}

/**
 * Renders a script as a sequence of word spans, highlighting the current
 * word and dimming past words. Auto-scrolls the active word into the
 * reading zone whenever currentIndex changes.
 */
export function ScriptDisplay({ tokens, currentIndex }: Props) {
  const activeRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      block: "center",
      behavior: "smooth",
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
            className={cn(
              "inline-block transition-all duration-300 ease-out",
              isPast && "text-zinc-600/50",
              isActive &&
                "scale-[1.02] text-yellow-200 drop-shadow-[0_0_24px_rgba(253,224,71,0.4)]",
              !isPast && !isActive && "text-zinc-100",
            )}
          >
            {token.text}
            {i < tokens.length - 1 && " "}
          </span>
        )
      })}
    </p>
  )
}
