import React from 'react';
import { Languages } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import { getUiText } from '../lib/uiText';

interface LanguageToggleProps {
  expanded?: boolean;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ expanded = false }) => {
  const { lang, setLang } = useLang();
  const copy = getUiText(lang);
  const nextLang = lang === 'VN' ? 'EN' : 'VN';
  const currentLabel = copy.shared.languageNames[lang];

  if (expanded) {
    return (
      <button
        onClick={() => setLang(nextLang)}
        className="app-panel-soft flex h-full w-full min-w-0 items-center gap-3 px-4 py-3 text-left"
        aria-label={copy.shared.languageToggle}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[rgba(30,23,19,0.08)] bg-white/60 text-slate-900 dark:border-white/8 dark:bg-white/6 dark:text-[var(--landing-text)]">
          <Languages size={18} />
        </div>
        <div className="min-w-0">
          <p className="app-overline">{copy.shared.languageLabel}</p>
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{currentLabel}</p>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => setLang(nextLang)}
      className="app-icon-button inline-flex h-11 w-11 items-center justify-center"
      aria-label={copy.shared.languageToggle}
    >
      <Languages size={18} />
    </button>
  );
};

