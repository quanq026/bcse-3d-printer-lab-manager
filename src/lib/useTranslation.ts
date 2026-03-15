import { useLang } from '../contexts/LanguageContext';
import { getUiText, fillText } from './uiText';

/** Convenience hook — replaces the repeated `useLang() + getUiText()` pattern. */
export function useTranslation() {
  const { lang, setLang } = useLang();
  const copy = getUiText(lang);
  return { lang, setLang, copy, fillText } as const;
}
