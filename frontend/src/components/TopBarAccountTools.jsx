import { getSession } from "../data/authStorage.js";
import { setLanguagePreference, setThemePreference } from "../data/uiPreferences.js";
import { getText } from "../data/translations.js";
import { useUiPreferences } from "../hooks/useUiPreferences.js";
import { useState } from "react";
import AccountProfileModal from "./AccountProfileModal.jsx";
import LanguageDropdown from "./LanguageDropdown.jsx";

export const TOPBAR_LANGUAGE_LABELS = {
  fr: "Français",
  en: "English",
  es: "Español",
  zh: "中文",
  hi: "हिन्दी",
  ar: "العربية",
  pt: "Português",
  ru: "Русский",
  de: "Deutsch",
  ja: "日本語",
};

/**
 * Thème (clair / sombre), sélecteur de langue, et pastille compte (pseudo / email).
 * @param {boolean} withAccountPill — afficher le nom (défaut : true). Mettre false sur la landing
 *   si tu gères l’identité ailleurs dans l’en-tête.
 * @param {boolean} showGuestLabel — si pas de session, afficher quand même le libellé visiteur (défaut : true).
 */
export function TopBarAccountTools({
  withAccountPill = true,
  showGuestLabel = true,
  className = "",
}) {
  const { language, theme } = useUiPreferences();
  const session = getSession();
  const [profileOpen, setProfileOpen] = useState(false);
  const t = (scope, key, fallback) => getText(language, scope, key, fallback);
  const label =
    session?.pseudo || session?.email || t("coach", "visitor", "Utilisateur");
  const showPill = withAccountPill && (session || showGuestLabel);
  const isLandingHeader =
    typeof className === "string" && className.split(/\s+/).filter(Boolean).includes("lp-header-tools");
  const accountInitial = (() => {
    const raw = (session?.pseudo || session?.email || label || "?").trim();
    const ch = raw.charAt(0);
    return ch ? ch.toUpperCase() : "?";
  })();
  const accountHint = t("common", "accountMenuHint", "Mon profil");

  const prefs = (
    <>
      <button
        type="button"
        className="nav-btn secondary"
        onClick={() => setThemePreference(theme === "dark" ? "light" : "dark")}
        aria-label={t("common", "theme", "Thème")}
      >
        {theme === "dark" ? t("common", "dark", "Sombre") : t("common", "clear", "Clair")}
      </button>
      <LanguageDropdown
        language={language}
        labels={TOPBAR_LANGUAGE_LABELS}
        onChange={setLanguagePreference}
        ariaLabel={t("common", "language", "Langue")}
      />
    </>
  );

  return (
    <div className={className ? `topbar-account-tools ${className}`.trim() : "topbar-account-tools"}>
      {isLandingHeader ? (
        <div
          className="lp-header-prefs"
          aria-label={`${t("common", "theme", "Thème")} · ${t("common", "language", "Langue")}`}
        >
          {prefs}
        </div>
      ) : (
        prefs
      )}
      {showPill && isLandingHeader && session ? (
        <button
          type="button"
          className="lp-account-trigger"
          title={session?.email || ""}
          aria-label={`${accountHint} — ${label}`}
          onClick={() => setProfileOpen(true)}
        >
          <span className="lp-account-avatar" aria-hidden="true">
            {accountInitial}
          </span>
          <span className="lp-account-meta">
            <span className="lp-account-hint">{accountHint}</span>
            <span className="lp-account-name">{label}</span>
          </span>
          <span className="lp-account-chevron" aria-hidden="true" />
        </button>
      ) : null}
      {showPill && !(isLandingHeader && session) ? (
        <button
          type="button"
          className="user-pill lp-session-badge"
          title={session?.email || ""}
          onClick={() => setProfileOpen(true)}
        >
          {label}
        </button>
      ) : null}
      <AccountProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
