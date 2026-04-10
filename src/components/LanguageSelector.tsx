import { LANGUAGES } from "@/lib/languages"
import { cn } from "@/lib/utils"

type Props = {
  value: string
  onChange: (code: string) => void
  className?: string
}

export function LanguageSelector({ value, onChange, className }: Props) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-3 text-sm text-zinc-400",
        className,
      )}
    >
      <span>Language</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-zinc-100 outline-none transition-colors hover:border-zinc-500 focus:border-purple-500"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>
    </label>
  )
}
