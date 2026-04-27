import { useState } from "react";
import { useUiPreferences } from "../hooks/useUiPreferences.js";
import { SUPPORTED_LANGUAGES, getText } from "../data/translations.js";
import { setLanguagePreference } from "../data/uiPreferences.js";

const LANGUAGE_LABELS = {
  fr: "🇫🇷 Français",
  en: "🇬🇧 English",
  es: "🇪🇸 Español",
  zh: "🇨🇳 中文",
  hi: "🇮🇳 हिन्दी",
  ar: "🇸🇦 العربية",
  pt: "🇧🇷 Português",
  ru: "🇷🇺 Русский",
  de: "🇩🇪 Deutsch",
  ja: "🇯🇵 日本語",
};

export default function LanguageSelector({ compact = false }) {
  const { language } = useUiPreferences();
  const [, forceUpdate] = useState(0);
  const aria = getText(language, "a11y", "languageSelector", "Changer de langue");
  const label = getText(language, "a11y", "languageLabel", "Langue");

  const handleChange = (e) => {
    const newLang = e.target.value;
    setLanguagePreference(newLang);
    forceUpdate((n) => n + 1);
  };

  if (compact) {
    return (
      <select
        value={language}
        onChange={handleChange}
        className="lang-select-compact"
        aria-label={aria}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {LANGUAGE_LABELS[lang]}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="lang-selector">
      <label htmlFor="lang-select" className="lang-label">
        {label}
      </label>
      <select
        id="lang-select"
        value={language}
        onChange={handleChange}
        className="lang-select"
        aria-label={aria}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {LANGUAGE_LABELS[lang]}
          </option>
        ))}
      </select>
    </div>
  );
}
