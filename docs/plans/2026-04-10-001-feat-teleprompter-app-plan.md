---
title: Speech-Driven Teleprompter Web App
type: feat
status: active
date: 2026-04-10
---

# Speech-Driven Teleprompter Web App

## Overview

Build a web-based teleprompter where Sjoerd pastes a script, enters a "perform" mode, and as he speaks the app highlights the current word and auto-scrolls to keep it in the reading zone. Built as a React/Vite SPA with React Bits Pro for visual polish, deployed publicly on Railway, source on GitHub.

## Problem Frame

Sjoerd wants a single-focal-point teleprompter for recording videos and talks. The highlight must track his actual speech so there is zero cognitive overhead of finding where he is in the script. Existing teleprompters either scroll at a fixed rate (need to match speed) or require expensive software. This is a personal tool — Chrome-only is fine.

## Requirements Trace

- R1: Paste or type a script of arbitrary length, persisted in browser.
- R2: Start/stop a "perform" mode that uses the browser microphone.
- R3: As user speaks, highlight the current word and advance through the script.
- R4: Auto-scroll so the current word stays in a comfortable reading zone.
- R5: Reset / restart without reloading; manual nudge for recovery.
- R6: Deployed publicly on Railway, source on public GitHub repo.
- R7: Visually polished — this is a product Sjoerd shows off, not a throwaway.
- R8: Multi-language support — user picks the script language up front (Dutch, English, German, French, Spanish, Italian, Portuguese). Language drives both speech recognition and text normalization.

## Scope Boundaries

**Non-goals:**
- Multi-user / accounts / backend database
- Recording or saving audio/video
- Safari/Firefox parity (Chrome/Edge only — Web Speech API limitation)
- Offline / PWA / installable
- Mid-session language switching (language is picked once per session in the editor; changing it stops recognition)
- Auto-detect language from the script text (user picks explicitly)
- Mobile-first (works on mobile Chrome, but desktop is primary)

## Context & Research

### Relevant Code and Patterns

- **Target repo:** `~/Projects/teleprompter` (new, greenfield — nothing to carry over)
- **React Bits Pro** is already licensed (Ultimate tier) — install keys and registry setup documented in memory `react-bits-pro.md`. Pattern to follow: `apps/dashboard/` in the homebase repo uses the same dual registry setup.
- **Railway static deploy** — follows the documented pattern: Dockerfile → `oven/bun:alpine` → minimal `Bun.serve` reading `process.env.PORT` with SPA fallback.

### External References

- MDN `SpeechRecognition` interface — `continuous: true`, `interimResults: true`, `lang: "en-US"`.
- Browser support: Chrome/Edge native; Safari partial; Firefox not supported. Feature-detect on mount.
- React Bits Pro catalog — candidate components: `silk-waves-tw` or `aurora-blur-tw` for subtle background, `blur-highlight-tw` for intro title, `smooth-cursor-tw` for cursor polish.

## Key Technical Decisions

- **Stack:** Vite + React + TypeScript + Tailwind v4, Bun as package manager and runtime (aligns with global dev rules).
- **Routing:** No router — single page, mode toggle (`"edit" | "perform"`) held in `App.tsx` state. YAGNI for a one-view app.
- **Speech engine:** browser-native `SpeechRecognition` / `webkitSpeechRecognition`. No API key, no cost, no backend. Continuous + interim results. `lang` is set per-session from the user's language choice.
- **Languages:** BCP-47 locale codes passed straight to `SpeechRecognition.lang`. Initial set: `nl-NL` (Dutch), `en-US` (English US), `en-GB` (English UK), `de-DE` (German), `fr-FR` (French), `es-ES` (Spanish), `it-IT` (Italian), `pt-PT` (Portuguese). Single source of truth in `src/lib/languages.ts`. Adding more is a one-line change.
- **Text normalization:** matcher compares `normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()` — strips accents so STT "cafe" matches script "café". Works for all Latin-script languages in the initial set. No language-specific stemming — YAGNI.
- **State:** `useState` for session; `localStorage` for script persistence **and selected language**. No global store, no React Context.
- **Teleprompter rendering:** custom React — script split into word spans, driven by a `currentIndex` state. React Bits components are fire-and-forget animations that don't accept controlled "current word" props, so the core highlight stays hand-rolled. React Bits is used for the surrounding chrome only.
- **Matching:** pure function `findNextMatch(tokens, currentIndex, spokenWords): number`. Sjoerd writes this (learning mode) — the matching strategy is the UX.
- **Visual polish:** React Bits Pro for background shader, intro title animation, and button hover effects. All via the `-tw` Tailwind variants.
- **Deploy:** Railway via CLI + git. Single Dockerfile, `oven/bun:alpine`, `bun run build` → static `dist/` served by a minimal `Bun.serve` file that reads `process.env.PORT`. No `deploy_function` — that sets a persistent `startCommand` that overrides Dockerfile `CMD` (documented gotcha in memory).
- **Secret hygiene — automatically enforced (CRITICAL, public repo):** Leaks are prevented by hooks that run without user action and *block* (not warn) on any match. Multiple independent layers:

  | # | Layer | How it's enforced | What blocks |
  |---|---|---|---|
  | 1 | `.gitignore` glob `.env*` | Committed to repo | `.env`, `.env.local`, `.env.*.local` all ignored |
  | 2 | No literal keys in source or docs | Reviewed in Phase 5.1 | Plan, README, commit messages reference `memory/react-bits-pro.md` — never the value |
  | 3 | `.gitleaks.toml` pinned in repo | Committed to repo | Includes a custom rule matching the `RBPU-[0-9A-F-]{36}` React Bits Pro pattern, plus the default ruleset |
  | 4 | **Husky pre-commit hook** running `gitleaks protect --staged --redact` | Auto-installed by `package.json` `prepare` script on `bun install` — zero manual steps | Exits non-zero → `git commit` aborts → the commit never exists |
  | 5 | **Husky pre-push hook** running `gitleaks detect --redact` on full history | Same auto-install | Exits non-zero → `git push` aborts → nothing leaves the machine |
  | 6 | **GitHub Actions** `.github/workflows/gitleaks.yml` on every push + PR | Runs in CI regardless of local hooks | Workflow fails → red check on PR → last line of defense if hooks are ever bypassed |
  | 7 | Runtime consumption via `${REACTBITS_LICENSE_KEY}` in `components.json` | shadcn env expansion at install time | Key never appears in bundled JS or source files |

  **Why this is actually automatic:** The `prepare` script in `package.json` runs `husky` on every `bun install`. Husky sets `core.hooksPath` to `.husky/` in the repo, so the hooks activate the first time anyone runs `bun install` — including Sjoerd's first-ever clone. No "remember to install hooks" step.

  **The one way to bypass** — `git commit --no-verify` / `git push --no-verify` — is an explicit user override. CI (layer 6) still catches it. Per global rules, hooks are never bypassed automatically.

  **Implementation reference:** Sjoerd's `twofeetdev:secure-repo` skill wraps this exact setup. Unit 1 invokes it rather than hand-rolling hook files.

## Open Questions

### Resolved During Planning

- **Browser scope?** Chrome/Edge only. Safari/Firefox show a "use Chrome" banner.
- **Backend needed?** No. 100% client-side. Mic stream never leaves the browser.
- **Routing library?** None — single app state toggle.
- **License source for React Bits Pro?** Existing Ultimate key stored in memory at `memory/react-bits-pro.md`. **Key value never appears in this plan, the repo, or any committed file** — see Secret Hygiene below.
- **Supported languages?** Dutch, English (US + UK), German, French, Spanish, Italian, Portuguese. Picked up front in the editor; persisted in `localStorage`; sent to `SpeechRecognition.lang` as BCP-47 codes.
- **Repo location?** `~/Projects/teleprompter` — assumed; trivial to rename if wrong.
- **GitHub repo name?** `teleprompter` — public, under Sjoerd's personal `Sjotie` account.

### Deferred to Implementation

- **Exact highlight colors, font size, scroll padding** — tune live while testing against a real script.
- **Matching window size** (how many upcoming tokens to scan for a match) — Sjoerd picks this while writing the matcher; start at 5.
- **Which React Bits background to ship** — try `silk-waves` and `aurora-blur`, pick whichever reads best behind text.
- **Whether to add a visible interim-transcript debug strip** — useful during development, may stay on as a "confidence display".

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification.*

**Data flow:**

```
[EditorView]
    │
    ▼  onChange → localStorage + App state
[App.tsx] ── mode="perform" ──▶ [PerformView]
                                     │
                                     ├─ tokenize(script) → Token[]
                                     │
                                     ├─ <ScriptDisplay tokens currentIndex />
                                     │       └─ word spans: past | active | upcoming
                                     │       └─ useEffect(currentIndex) → scrollIntoView
                                     │
                                     └─ createRecognizer({ onTranscript })
                                             │
                                             ▼
                                     onTranscript(spokenWords)
                                             │
                                             ▼
                                     findNextMatch(tokens, currentIndex, spokenWords) ← USER WRITES
                                             │
                                             ▼
                                     setCurrentIndex(...)
```

**Session state machine:**

```
  idle ──start──▶ listening ──match──▶ listening (index++)
    ▲                │                      │
    └── reset ───────┴──── stop/end ────────┘
```

## Implementation Units

- [ ] **Unit 1: Scaffold project + shadcn + React Bits Pro registries**

**Goal:** Working Vite + React + TS + Tailwind project with shadcn initialized and React Bits Pro registries configured, ready to pull in components.

**Requirements:** R7 (foundation for polish)

**Dependencies:** None

**Files:**
- Create: `package.json` (includes `"prepare": "husky"` script for auto-install of hooks), `bun.lockb`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/vite-env.d.ts`
- Create: `tailwind.config.ts`, `postcss.config.js`
- Create: `components.json` (shadcn config with React Bits Pro registries block)
- Create: `src/lib/utils.ts` (`cn` helper)
- Create: `src/lib/languages.ts` (single source of truth for supported languages — `{ code: "nl-NL", label: "Nederlands" }`, etc.)
- Create: `.env.local` — **value loaded from `memory/react-bits-pro.md` at install time; NEVER committed, NEVER pasted into the plan or any other file**
- Create: `.env.local.example` — variable name only: `REACTBITS_LICENSE_KEY=`
- Create: `.gitignore` — must include `.env*` glob (not just `.env.local`), plus `node_modules`, `dist`, `.husky/_`
- Create: `.gitleaks.toml` — custom rule for `RBPU-[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}` pattern, extends default ruleset
- Create: `.husky/pre-commit` — runs `gitleaks protect --staged --redact`
- Create: `.husky/pre-push` — runs `gitleaks detect --redact --no-banner`
- Create: `.github/workflows/gitleaks.yml` — runs `gitleaks/gitleaks-action@v2` on push + PR
- Create: `README.md` (placeholder — full copy in Unit 5)

**Approach:**
- `cd ~/Projects/teleprompter && bun create vite . --template react-ts`
- `bun install`
- Install and configure Tailwind v4: `bun add -D tailwindcss @tailwindcss/vite`, add plugin to `vite.config.ts`, add `@import "tailwindcss"` to `src/index.css`
- `bunx shadcn@latest init` — accept defaults, TypeScript, default style
- Patch `components.json` with the `registries` block for `@reactbits-starter` and `@reactbits-pro` (copy structure from `memory/react-bits-pro.md` — the `Authorization: Bearer ${REACTBITS_LICENSE_KEY}` reference stays as an env var expansion, never inlined)
- **Set up the license key WITHOUT leaking it:**
  1. Write the placeholder `.env.local.example` file (variable name only, empty value) and commit it.
  2. Create `.env.local` locally by reading the value out of `memory/react-bits-pro.md` at the command line — e.g., open the file, copy the value, paste into `.env.local`. The actual value never enters the plan, shell history (avoid `echo KEY=... >> .env.local`), or any AI chat log.
  3. Verify `.env.local` is gitignored: `git check-ignore .env.local` should print the filename.
- **Set up the auto-enforced secret hygiene chain BEFORE the first commit (must exist in commit #1):**
  1. `bun add -D husky` → `bunx husky init` — creates `.husky/` dir, adds `prepare` script to `package.json`.
  2. Install gitleaks locally: `brew install gitleaks` (on first run only — user install, not project dep).
  3. Write `.husky/pre-commit` → `gitleaks protect --staged --redact || exit 1`.
  4. Write `.husky/pre-push` → `gitleaks detect --redact --no-banner || exit 1`.
  5. Write `.gitleaks.toml` with the custom `RBPU-*` rule.
  6. Write `.github/workflows/gitleaks.yml` using `gitleaks/gitleaks-action@v2`.
  7. **Self-test before trusting it:** temporarily create a test file containing a fake-but-matching `RBPU-AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA` pattern, `git add`, attempt `git commit` — MUST fail with gitleaks blocking it. Delete the test file. Only then proceed.
- Verify React Bits auth by previewing (not installing): `bunx shadcn@latest view @reactbits-starter/silk-waves-tw` — confirms auth works before wasting installs.
- `App.tsx` owns `mode: "edit" | "perform"`, `script: string`, and `selectedLang: string` (BCP-47 code). Persist `script` and `selectedLang` to `localStorage` on change, hydrate on mount. Default language: `"en-US"`.

**Patterns to follow:**
- Dual-registry setup documented in `react-bits-pro.md` — matches the existing `apps/dashboard/` config.

**Test scenarios:**
- Test expectation: none — scaffolding, no behavioral logic. Verified by running dev server.

**Verification:**
- `bun run dev` launches at localhost:5173, Tailwind styles apply.
- `bunx shadcn view @reactbits-starter/silk-waves-tw` returns 200 (not 401/403).
- **Secret hygiene self-test passed:** attempting to commit a file with a matching `RBPU-*` fake pattern is blocked by the pre-commit hook (non-zero exit, no commit created).
- `git check-ignore .env.local` prints the filename (confirming it's ignored).
- `git log --all -p -- .env.local` returns empty (the file was never committed, even accidentally).
- Fresh clone test: `cd /tmp && git clone <repo> test-clone && cd test-clone && bun install` — hooks auto-install; `ls .husky/pre-commit` exists; a mock violating commit is blocked.

---

- [ ] **Unit 2: Core teleprompter — editor, language picker, word rendering, manual navigation**

**Goal:** The teleprompter works end-to-end without speech. Sjoerd types a script, picks a language, switches to perform mode, and can manually advance word-by-word with arrow keys or buttons. The highlight moves and the view auto-scrolls.

**Requirements:** R1, R3, R4, R5, R8

**Dependencies:** Unit 1

**Files:**
- Create: `src/views/EditorView.tsx`
- Create: `src/views/PerformView.tsx`
- Create: `src/components/ScriptDisplay.tsx`
- Create: `src/components/LanguageSelector.tsx`
- Create: `src/lib/tokenize.ts`
- Create: `src/lib/tokenize.test.ts`
- Modify: `src/App.tsx` (pass `selectedLang` to both views)

**Approach:**
- `tokenize(script: string): Token[]` — splits on whitespace, keeps punctuation attached to the word. Each token: `{ text: string, normalized: string }` where `normalized` is `text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")` — strips accents and punctuation, Unicode-letter-aware. Works for Dutch, French, German, etc.
- `LanguageSelector` — small `<select>` populated from `src/lib/languages.ts`. Shows native label (`Nederlands`, `English (US)`, `Deutsch`, `Français`, …). Change writes to `App` state + `localStorage` under key `teleprompter.lang`. Language change while in perform mode is not allowed (the selector is only shown in the editor).
- `ScriptDisplay` takes `tokens`, `currentIndex`, renders each token as a `<span data-index={i}>`. Styles: `< currentIndex` → dim (past), `=== currentIndex` → highlighted (active), `> currentIndex` → normal (upcoming).
- `useEffect` on `currentIndex` uses `scrollIntoView({ block: "center", behavior: "smooth" })` on the active span ref.
- `PerformView` holds `currentIndex` state, displays the chosen language as read-only pill (e.g., "🇳🇱 Nederlands") for clarity, and exposes:
  - `←` / `→` keys to nudge index
  - `R` key to reset to 0
  - Visible buttons for the same (for mobile / no-keyboard)
  - "Back to editor" button → sets `App` mode to `"edit"`
- `EditorView` contains: `LanguageSelector`, a large `<textarea>`, a "Start perform" button (disabled if script is empty), and a character/word count. onChange on the textarea writes to `App` state and `localStorage`.

**Patterns to follow:**
- Pure prop-driven rendering, side effects isolated to one `useEffect` per concern.
- Controlled components throughout.

**Test scenarios:**
- Happy path: `tokenize("hello world")` → 2 tokens, normalized `["hello", "world"]`.
- Happy path: `tokenize("don't stop, believing!")` → 3 tokens, punctuation stays on the displayed text, normalized forms are `["dont", "stop", "believing"]`.
- Happy path (Dutch): `tokenize("één twee drie")` → 3 tokens, normalized `["een", "twee", "drie"]` — diacritics stripped.
- Happy path (German): `tokenize("schöne Grüße")` → 2 tokens, normalized `["schone", "grusse"]`.
- Happy path (French): `tokenize("café où")` → 2 tokens, normalized `["cafe", "ou"]`.
- Edge case: `tokenize("")` → empty array.
- Edge case: `tokenize("  multiple   spaces  ")` → 2 tokens, no empty strings.
- Happy path: `ScriptDisplay` with 5 tokens and `currentIndex=2` — third span has active class, first two have past class, last two have upcoming class. (Component test with Testing Library.)
- Edge case: `currentIndex` beyond last word → does not crash, last word stays active.
- Edge case: `currentIndex = -1` → no span marked active.
- Happy path: `LanguageSelector` change writes the new code to `localStorage["teleprompter.lang"]`; reload rehydrates the choice.

**Verification:**
- Type a 50-word script in the editor, pick `Nederlands` from the language selector, switch to perform — the pill shows `🇳🇱 Nederlands`. Press `→` 10 times — highlight visibly advances word-by-word, view scrolls smoothly, past words are dim. Refresh the page — script AND language both persist. Press `R` — highlight resets to word 0. Paste a Dutch sentence with diacritics ("één twee drie vier") — renders correctly, tokenize tests already confirm normalization.

---

- [ ] **Unit 3: Speech recognition + word-matching loop** 🎓 *LEARNING MODE*

**Goal:** Wire the Web Speech API into the `currentIndex` state so the highlight advances in response to Sjoerd's actual voice, in the user-selected language. The core matching function is written by Sjoerd.

**Requirements:** R2, R3, R8

**Dependencies:** Unit 2

**Files:**
- Create: `src/lib/speech.ts` — thin wrapper around `(window as any).webkitSpeechRecognition || window.SpeechRecognition`
- Create: `src/lib/matcher.ts` — contains `findNextMatch` function signature + JSDoc + `TODO` marker. **Sjoerd writes the body.**
- Create: `src/lib/matcher.test.ts` — pre-written failing tests Sjoerd runs as TDD checkpoint
- Modify: `src/views/PerformView.tsx` — add `<Start/Stop Mic>` button, wire recognizer → matcher → `setCurrentIndex`, handle errors (`not-allowed`, `no-speech`, `aborted`), show browser-support banner if API missing

**Approach:**
- `speech.ts` exports `createRecognizer({ lang, onTranscript, onError, onStatusChange })` returning `{ start, stop }`. `lang` is a BCP-47 code (e.g., `"nl-NL"`, `"en-US"`) passed through to `recognition.lang`. Uses `continuous: true` and `interimResults: true`. On each `result` event, extracts spoken words since last emit, normalizes them with the same diacritic-stripping function as `tokenize.ts` (shared helper so script and voice are normalized identically), and pushes them as a `string[]` to `onTranscript`.
- `matcher.ts` exports:
  ```
  /**
   * Given the script tokens, the current pointer, and newly spoken words,
   * return the new pointer (>= currentIndex). Return currentIndex unchanged
   * if no match. Return tokens.length when the script is complete.
   */
  export function findNextMatch(
    tokens: Token[],
    currentIndex: number,
    spokenWords: string[]
  ): number
  ```
- `PerformView` receives `selectedLang` as a prop and passes it to `createRecognizer({ lang: selectedLang, ... })`. Uses a ref to hold the recognizer instance across renders. Start/stop toggles it. On `onTranscript`, calls `setCurrentIndex(i => findNextMatch(tokens, i, words))`.
- Error handling: `not-allowed` → "enable mic permissions" banner; `language-not-supported` → "your browser doesn't support \<language\> recognition, try English" banner; `aborted` / `no-speech` → auto-restart once, then show "click to resume"; recognition API missing → "use Chrome" banner.
- Recognizer MUST be stopped on `PerformView` unmount, on browser `visibilitychange → hidden`, AND when `selectedLang` changes (defensive — even though the selector is hidden in perform mode), or the mic stays hot.

**Learning mode contribution:**
Sjoerd writes the body of `findNextMatch` — roughly 5–10 lines. This is where the UX lives. Trade-offs to weigh:

| Strategy | Pro | Con |
|---|---|---|
| **Strict exact match** — only advance if `tokens[currentIndex + 1].normalized === spokenWords[0]` | Predictable, no false positives | Breaks on stutters, filler words, and any mispronunciation — highlight gets "stuck" |
| **Fuzzy + forward window** — scan `tokens[currentIndex+1 .. currentIndex+N]` for any spoken word match; jump to the furthest match | Tolerates skipped filler, mispronunciation, speaker rushing ahead | Can leap ahead on false positives (e.g., speaker says "and" and the word "and" appears 4 words later) |
| **Levenshtein fuzzy** — match upcoming tokens by edit distance ≤ 1 | Handles mispronunciation beyond exact match | More complex; risk of over-matching short words |

**Recommended starting point:** fuzzy + forward window with `N=5`. Iterate after testing against a real script.

The pre-written tests in `matcher.test.ts` will run red until Sjoerd writes the body. Running `bun test` should be his first move after reading the function signature — the tests tell him the target behavior concretely.

**Patterns to follow:**
- Pure function matcher, no DOM, no React imports — fully unit-testable.
- Recognizer instance lives in a ref, not state, so it doesn't trigger re-renders.

**Test scenarios (pre-written for learning mode TDD):**
- Happy path: tokens `["hello", "world", "how", "are", "you"]`, `currentIndex=-1`, spoken `["hello"]` → returns `0`.
- Happy path: same tokens, `currentIndex=0`, spoken `["world"]` → returns `1`.
- Happy path: speaker says several words in one transcript chunk: `spokenWords=["world", "how", "are"]`, `currentIndex=0` → returns `3`.
- Edge case: no match — tokens `["hello", "world"]`, `currentIndex=0`, spoken `["banana"]` → returns `0` (unchanged).
- Edge case: speaker skips a word — tokens `["hello", "world", "how"]`, `currentIndex=0`, spoken `["how"]` within window → returns `2`.
- Edge case: punctuation ignored — tokens with `"hello,"` matched against spoken `"hello"` (both normalize to `"hello"`).
- Edge case: reaching the end — `currentIndex = tokens.length - 1`, spoken = last word → returns `tokens.length`.
- Edge case: empty `spokenWords` → returns `currentIndex` unchanged.
- Integration: `PerformView` test with a mocked recognizer that emits scripted transcripts — verifies `currentIndex` advances through a 10-word script.

**Execution note:** Test-first — Sjoerd should run `bun test src/lib/matcher.test.ts` before writing the body. Red → write → green.

**Verification:**
- In Chrome, grant mic permission, start perform mode with language `en-US`, read the first sentence of an English script aloud. Highlight visibly tracks voice. Pause, resume — no weirdness. Say an off-script word ("uhhh") — highlight stays put. Stop button cleanly releases the mic (no browser tab mic indicator).
- Switch language to `nl-NL` in the editor, paste a Dutch script, start perform mode, read aloud. Highlight tracks Dutch voice. Diacritics (`één`) match without issue.
- Repeat the smoke test for `de-DE` with a short German sentence.

---

- [ ] **Unit 4: Visual polish with React Bits Pro**

**Goal:** The app looks intentional and premium, not like a scaffolded weekend project. Use React Bits Pro for the surrounding chrome while keeping the core text rendering untouched (it must stay controlled by `currentIndex`).

**Requirements:** R7

**Dependencies:** Unit 3

**Files:**
- Install (via shadcn CLI): `@reactbits-starter/silk-waves-tw` OR `@reactbits-starter/aurora-blur-tw` → `src/components/react-bits/silk-waves.tsx` (or equivalent)
- Install: `@reactbits-starter/blur-highlight-tw` for the landing/title screen → `src/components/react-bits/blur-highlight.tsx`
- Install: `@reactbits-starter/smooth-cursor-tw` (optional, desktop polish) → `src/components/react-bits/smooth-cursor.tsx`
- Modify: `src/App.tsx` — wrap root in background shader container
- Modify: `src/views/EditorView.tsx` — add animated title using `blur-highlight`, improved layout
- Modify: `src/views/PerformView.tsx` — add subtle background, tasteful mic status indicator, fade-in for the script display

**Approach:**
- `bunx shadcn@latest add @reactbits-starter/silk-waves-tw @reactbits-starter/aurora-blur-tw @reactbits-starter/blur-highlight-tw`
- Try both `silk-waves` and `aurora-blur` behind the perform view at low opacity (~0.2). Pick whichever has less visual noise behind text. Commit only the winner.
- Editor title: `<BlurHighlight>Teleprompter</BlurHighlight>` or similar.
- Perform view layout: centered reading column (~700px max-width), script display vertically centered, background fills the screen.
- Typography: large serif or soft sans (e.g., Inter at 3rem+), generous line-height (1.8+), high contrast.
- Highlight style for the active word: soft glow + slight scale-up, not a harsh color block. Past words at ~40% opacity.
- **Non-goal:** Do NOT attempt to drive `blur-highlight` with `currentIndex`. It is a fire-and-forget animation, not a controlled component. The script display stays custom.

**Patterns to follow:**
- React Bits components are `"use client"` and use default exports — import per the skill docs.
- Lazy-load WebGL-heavy components with `React.lazy` if they hurt initial paint; measure first.

**Test scenarios:**
- Test expectation: none — visual polish. Validated by eye, on a real device.

**Verification:**
- Open perform view — background shader plays smoothly, script renders in a centered reading column, active word has a subtle glow, past words dim. Editor view has an animated title. Nothing obscures or competes with the script text.

---

- [ ] **Unit 5: GitHub repo + Railway deploy**

**Goal:** Public GitHub repo at `github.com/Sjotie/teleprompter`, public HTTPS URL on Railway, deploy triggered by `git push` going forward.

**Requirements:** R6

**Dependencies:** Unit 4

**Files:**
- Create: `Dockerfile` — multi-stage build (`oven/bun:alpine` build stage → `oven/bun:alpine` runtime), copies `dist/` and `server.ts`
- Create: `server.ts` — minimal `Bun.serve` serving `dist/` with SPA fallback to `index.html`, reading `process.env.PORT`
- Create: `.dockerignore` — excludes `node_modules`, `.env*`, `dist`, `.git`
- Create: `railway.json` — optional; set `build.builder = "DOCKERFILE"` and leave runtime to Dockerfile `CMD`
- Modify: `README.md` — full content: what it is, Chrome-only notice, local dev, deploy, acknowledgments
- Modify: `.gitignore` — double-check `.env.local` excluded

**Approach:**

1. **GitHub first:**
   - `cd ~/Projects/teleprompter`
   - `git init && git add . && git commit -m "feat: initial teleprompter app"`
   - **Confirm with Sjoerd before pushing** (global rule: confirm before `git push` / destructive ops).
   - `gh repo create teleprompter --public --source=. --push --description "Speech-driven teleprompter web app"`

2. **Dockerfile pattern:**
   ```dockerfile
   FROM oven/bun:alpine AS builder
   WORKDIR /app
   COPY package.json bun.lockb ./
   RUN bun install --frozen-lockfile
   COPY . .
   RUN bun run build

   FROM oven/bun:alpine
   WORKDIR /app
   COPY --from=builder /app/dist ./dist
   COPY --from=builder /app/server.ts ./
   CMD ["bun", "run", "server.ts"]
   ```

3. **`server.ts` pattern** — single `Bun.serve({ port: Number(process.env.PORT ?? 3000), fetch: async req => ... })` that:
   - Serves files from `dist/` by URL path
   - Falls back to `dist/index.html` for any path that doesn't match a file (SPA routing, even though we have no routes — safety)
   - Sets correct `Content-Type` per extension

4. **Railway deploy — use the railway skill's CLI workflow:**
   - **Preflight:** `railway whoami --json`, `railway --version` — confirm logged in.
   - `cd ~/Projects/teleprompter && railway status --json` — expect unlinked.
   - `railway init --name teleprompter` — create new project.
   - `railway up --detach -m "initial deploy"` — first deploy from local directory (Dockerfile auto-detected).
   - `railway domain` — generate a public domain.
   - `railway logs --lines 100 --json` — verify build succeeded and server is listening on `process.env.PORT`.
   - Connect GitHub source for auto-deploy on push: via dashboard or `railway service` configuration — confirm with Sjoerd if needed.
   - **Do NOT use `deploy_function` MCP tool** — it sets a persistent `startCommand` that overrides the Dockerfile `CMD` (documented gotcha in memory `railway_static_html_deploy.md`).

5. **Acceptance check** — open the Railway URL in Chrome on laptop, grant mic, read a test script aloud, watch it work end-to-end. Then open on iPhone Chrome and confirm it at least loads (mic behavior on mobile is bonus, not required).

**Patterns to follow:**
- Sjoerd's documented Railway static HTML deploy pattern (from memory): `oven/bun:alpine`, inline server reading `process.env.PORT`, Dockerfile CMD, no MCP `deploy_function`.
- Railway CLI with `--json` flags for reliable parsing.

**Test scenarios:**
- Test expectation: none — deploy is validated by live smoke test.

**Verification:**
- Railway URL serves the app over HTTPS.
- `curl -I https://<railway-url>/` returns 200 with `content-type: text/html`.
- Chrome on desktop: mic prompt appears, speech drives the highlight, tab mic indicator turns off when recording stops.
- `git push origin master` triggers a new Railway build (verify with `railway logs`).
- `.env.local` is NOT in the repo (`git log --all --full-history -- .env.local` returns nothing).

## System-Wide Impact

- **Interaction graph:** Browser mic → `SpeechRecognition` API → React state (`currentIndex`) → DOM render + `scrollIntoView`. No backend, no network calls during a session.
- **Error propagation:** Recognition errors (`not-allowed`, `no-speech`, `aborted`, unsupported API) surface as status banners in `PerformView`. No silent failures.
- **State lifecycle risks:** Recognizer must stop on `PerformView` unmount, on `visibilitychange → hidden`, and on mode toggle back to editor — otherwise the mic stays hot. Explicit cleanup in `useEffect` return.
- **API surface parity:** None — single app, no shared interfaces.
- **Integration coverage:** Matcher is pure-function and fully unit-testable. Recognition is mocked in `PerformView` integration test.
- **Unchanged invariants:** N/A — greenfield.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Web Speech API absent / flaky in user's browser | Feature-detect on `PerformView` mount; show clear "use Chrome" banner with link. |
| Speech recognition gets stuck or drifts | Fuzzy forward-window matcher + manual `←`/`→`/`R` nudges let Sjoerd recover without restart. |
| Mic permission denied | Catch `not-allowed` error, show permission recovery instructions. |
| Mic stays hot after leaving perform view | Explicit cleanup in `useEffect` return, plus `visibilitychange` listener. |
| Railway deploy fails on first push (PORT binding, SPA fallback) | Use the documented `Bun.serve` + `process.env.PORT` pattern; verify with `railway logs` immediately after deploy. |
| React Bits Pro components hurt performance / block initial paint | Measure with Lighthouse after Unit 4; lazy-load heavy WebGL components via `React.lazy` if needed. |
| Accidentally committing the React Bits Pro license key | **Automatically prevented** by the layered secret-hygiene chain (see Key Technical Decisions → Secret hygiene): `.env*` gitignore glob, `.gitleaks.toml` with `RBPU-*` custom rule, Husky pre-commit + pre-push hooks (auto-installed via `package.json` `prepare` script), and a GitHub Actions CI scan as a final net. Self-tested in Unit 1 verification with a fake matching pattern. The only bypass is an explicit `--no-verify`, and CI catches that. |
| A contributor (or future Sjoerd on a fresh clone) forgets to install hooks | `prepare: "husky"` script in `package.json` runs on every `bun install` and activates hooks before any commit is possible. No manual step. |
| Speech recognition unsupported for a selected language in Chrome | Catch the `language-not-supported` error, show the user a banner suggesting they fall back to English. |
| Repo accidentally private / missing from GitHub | `gh repo create --public` with explicit flag; verify URL loads while logged out. |

## Documentation / Operational Notes

- **README.md** — what it is, Chrome-only notice, local dev (`bun install && bun run dev`), how to deploy, screenshots/GIF optional.
- **No monitoring needed** — static site, no backend, failures are visible immediately to Sjoerd.
- **License key handling** — `.env.local` only, never committed. `.env.local.example` documents the required var.

## Sources & References

- **Origin document:** none — planned directly from user request on 2026-04-10.
- React Bits Pro setup: `memory/react-bits-pro.md` (license key + registry config).
- Railway static HTML deploy pattern: `memory/MEMORY.md` → "Railway Static HTML Deployment".
- Skills loaded for this plan: `react-bits-pro`, `use-railway`.
- External: MDN `SpeechRecognition` interface docs, React Bits Pro catalog.
