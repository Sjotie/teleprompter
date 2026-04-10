import BlurHighlight from "@/components/react-bits/blur-highlight"
import AuroraBlur from "@/components/react-bits/aurora-blur"
import { LanguageSelector } from "@/components/LanguageSelector"

type Props = {
  script: string
  onScriptChange: (script: string) => void
  language: string
  onLanguageChange: (code: string) => void
  onStart: () => void
}

export function EditorView({
  script,
  onScriptChange,
  language,
  onLanguageChange,
  onStart,
}: Props) {
  const wordCount =
    script.trim().length > 0 ? script.trim().split(/\s+/).length : 0
  const canStart = wordCount > 0

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <AuroraBlur />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-8">
        <header className="flex items-end justify-between">
          <BlurHighlight
            className="font-serif text-5xl tracking-tight text-zinc-100"
            highlightedBits={["prompter"]}
            highlightColor="#c084fc"
            blurAmount={10}
          >
            Teleprompter
          </BlurHighlight>
          <LanguageSelector value={language} onChange={onLanguageChange} />
        </header>

        <textarea
          value={script}
          onChange={(e) => onScriptChange(e.target.value)}
          placeholder="Paste or type your script here…"
          spellCheck={false}
          className="min-h-[50vh] flex-1 resize-none rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6 font-serif text-xl leading-relaxed text-zinc-100 outline-none backdrop-blur-sm transition-colors placeholder:text-zinc-600 focus:border-purple-500/50"
        />

        <footer className="flex items-center justify-between text-sm text-zinc-500">
          <span>
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart}
            className="rounded-lg bg-purple-600 px-6 py-2.5 font-medium text-white shadow-lg shadow-purple-500/20 transition-all hover:bg-purple-500 hover:shadow-purple-500/40 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none"
          >
            Start perform →
          </button>
        </footer>
      </div>
    </div>
  )
}
