import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SUPPORTED_LANGUAGES } from "../data/translations.js";

function measurePanelPosition(triggerEl) {
  if (!triggerEl) return null;
  const r = triggerEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const panelMin = 240;
  const pad = 12;
  let left = r.right - panelMin;
  left = Math.max(pad, Math.min(left, vw - panelMin - pad));
  return {
    top: r.bottom + 8,
    left,
    minWidth: Math.max(panelMin, r.width),
  };
}

/**
 * Menu langue (pas de <select> natif : sous Windows la liste reste blanche malgré le CSS).
 * Panneau rendu en portail sur document.body pour éviter overflow / z-index dans les headers.
 */
export default function LanguageDropdown({
  language,
  labels,
  onChange,
  ariaLabel,
  triggerClassName = "nav-btn secondary lang-dropdown-trigger",
}) {
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPanelPos(null);
      return;
    }
    setPanelPos(measurePanelPosition(triggerRef.current));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (triggerRef.current) setPanelPos(measurePanelPosition(triggerRef.current));
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inPanel = panelRef.current?.contains(e.target);
      if (!inTrigger && !inPanel) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const panel =
    open && panelPos ? (
      <ul
        ref={panelRef}
        className="lang-dropdown-panel lang-dropdown-panel--portal"
        role="listbox"
        aria-label={ariaLabel}
        style={{
          position: "fixed",
          top: panelPos.top,
          left: panelPos.left,
          minWidth: panelPos.minWidth,
          zIndex: 2147483000,
        }}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <li key={lang} role="none">
            <button
              type="button"
              role="option"
              aria-selected={language === lang}
              className={`lang-dropdown-option${language === lang ? " is-active" : ""}`}
              onClick={() => {
                onChange(lang);
                setOpen(false);
              }}
            >
              {labels[lang] ?? lang}
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div className="lang-dropdown">
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="lang-dropdown-current">{labels[language] ?? language}</span>
        <svg
          className="lang-dropdown-chevron"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 4.5 6 7.5 9 4.5"
          />
        </svg>
      </button>
      {panel && typeof document !== "undefined"
        ? createPortal(panel, document.body)
        : null}
    </div>
  );
}
