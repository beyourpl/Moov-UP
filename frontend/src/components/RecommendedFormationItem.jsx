import { getFormationResume } from "../data/formationDisplay.js";

function cleanLink(lien) {
  const u = String(lien || "").trim();
  return u && u.startsWith("http") ? u : "";
}

function truncateLabel(text, max = 88) {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/**
 * Formation dans la colonne « métiers recommandés » (affichage épuré sur Moov'Up).
 */
export default function RecommendedFormationItem({
  f,
  t,
  onAskCoach,
  compact = true,
  showOnisepLink = false,
}) {
  const libelle = String(f?.libelle || "").trim() || t("formationUntitled", "Formation");
  const meta = getFormationResume(f, {
    durationPrefix: t("formationDurationPrefix", "Durée : "),
  });
  const lien = showOnisepLink ? cleanLink(f?.lien) : "";

  return (
    <li className={`rec-formation-item${compact ? " rec-formation-item--compact" : ""}`}>
      <div className="rec-formation-main">
        <p className="rec-formation-title" title={libelle}>
          {truncateLabel(libelle, compact ? 96 : 140)}
        </p>
        {meta ? <p className="rec-formation-meta">{meta}</p> : null}
      </div>
      {onAskCoach ? (
        <button type="button" className="rec-formation-ask" onClick={onAskCoach}>
          {t("askFormationCoachShort", "Demander le détail →")}
        </button>
      ) : null}
      {!compact && lien ? (
        <a
          className="rec-formation-onisep-link"
          href={lien}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("formationSourceOnisep", "Source ONISEP (site externe)")}
        </a>
      ) : null}
    </li>
  );
}
