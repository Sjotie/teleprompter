import { useEffect, useState } from "react"
import { EditorView } from "@/views/EditorView"
import { PerformView } from "@/views/PerformView"
import { DEFAULT_LANGUAGE } from "@/lib/languages"

type Mode = "edit" | "perform"

const SCRIPT_KEY = "teleprompter.script"
const LANG_KEY = "teleprompter.lang"

export default function App() {
  const [mode, setMode] = useState<Mode>("edit")
  const [script, setScript] = useState(() => {
    if (typeof window === "undefined") return ""
    return localStorage.getItem(SCRIPT_KEY) ?? ""
  })
  const [language, setLanguage] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE
    return localStorage.getItem(LANG_KEY) ?? DEFAULT_LANGUAGE
  })

  useEffect(() => {
    localStorage.setItem(SCRIPT_KEY, script)
  }, [script])

  useEffect(() => {
    localStorage.setItem(LANG_KEY, language)
  }, [language])

  if (mode === "perform") {
    return (
      <PerformView
        script={script}
        language={language}
        onBack={() => setMode("edit")}
      />
    )
  }

  return (
    <EditorView
      script={script}
      onScriptChange={setScript}
      language={language}
      onLanguageChange={setLanguage}
      onStart={() => setMode("perform")}
    />
  )
}
