export type Language = {
  code: string
  label: string
  flag: string
}

export const LANGUAGES: Language[] = [
  { code: "en-US", label: "English (US)", flag: "🇺🇸" },
  { code: "en-GB", label: "English (UK)", flag: "🇬🇧" },
  { code: "nl-NL", label: "Nederlands", flag: "🇳🇱" },
  { code: "de-DE", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr-FR", label: "Français", flag: "🇫🇷" },
  { code: "es-ES", label: "Español", flag: "🇪🇸" },
  { code: "it-IT", label: "Italiano", flag: "🇮🇹" },
  { code: "pt-PT", label: "Português", flag: "🇵🇹" },
]

export const DEFAULT_LANGUAGE = "en-US"

export function getLanguage(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]
}
