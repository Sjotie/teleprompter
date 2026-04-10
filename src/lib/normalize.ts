/**
 * Normalize a word for matching: lowercase, strip diacritics, map ß→ss,
 * and remove all non-letter/non-digit characters.
 *
 * Used by both tokenize.ts (script side) and speech.ts (voice side) so
 * that script tokens and recognized words normalize to the same form.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replaceAll("ß", "ss")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
}
