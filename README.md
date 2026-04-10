# Teleprompter

A speech-driven teleprompter: paste your script, pick a language, and as you speak
the highlight tracks your voice and auto-scrolls. Built for a single focal point
so you can read naturally into a camera without hunting for your place.

## Features

- **Speech-driven highlight** — the current word lights up as you say it, and the view
  auto-scrolls to keep it centered. Uses a fuzzy forward-window matcher so it
  tolerates filler words, stutters, and small skips.
- **Multi-language** — English (US/UK), Dutch, German, French, Spanish, Italian,
  Portuguese. Diacritic-aware normalization so "café" in the script matches
  "cafe" from the speech recognizer.
- **Manual fallback controls** — ←/→ to nudge a word, R to reset, Space to toggle
  the mic, Esc to exit.
- **Polished visuals** — subtle WebGL silk-waves background, animated title, large
  serif typography.

## Browser support

Requires the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
with continuous recognition — **Chrome and Edge only**. Safari and Firefox will show
a banner asking you to switch browsers.

## Local development

```bash
bun install
bun run dev
```

The app runs at http://localhost:5173. Grant microphone permission when prompted.

## Secrets / license

This project uses [React Bits Pro](https://pro.reactbits.dev/) for some visual
components, which requires an API key at install time only. Create `.env.local`
with your key (see `.env.local.example`):

```
REACTBITS_LICENSE_KEY=<your key>
```

`.env.local` is gitignored. A **gitleaks** pre-commit hook (auto-installed via
`bun install` → Husky) blocks any commit that introduces a key matching the
`RBPU-*` pattern. A pre-push hook and a GitHub Actions workflow run the same
scan as belt-and-braces. If you ever see the hook block a commit, that's
working as intended.

## Deploy (Railway)

Build and runtime both use Bun via a multi-stage `Dockerfile`. The server
(`server.ts`) is a tiny `Bun.serve` that reads `process.env.PORT`.

```bash
railway init --name teleprompter
railway up --detach
railway domain
```

Pushes to `main` redeploy automatically once the GitHub source is connected.

## Tests

```bash
bun test
```

Covers `tokenize` (whitespace, punctuation, diacritics across multiple
languages) and `findNextMatch` (exact match, forward window, backward
clamping, lookahead boundary, end-of-script).

## Tech

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- React Bits Pro (silk-waves, aurora-blur, blur-highlight)
- Bun (package manager, test runner, production server)
- Web Speech API (`webkitSpeechRecognition`)

## License

MIT — do whatever you want with it.
