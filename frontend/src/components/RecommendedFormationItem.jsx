import { getFormationBadges, getFormationResume, formatFormationDomainHint } from "../data/formationDisplay.js";

/**
 * Une formation liée à un métier recommandé (contenu affiché sur Moov'Up ; lien ONISEP discret).
 */
export default function RecommendedFormationItem({ f, t, showOnisepLink = true }) {
  const libelle = String(f?.libelle || "").trim() || t("formationUntitled", "Formation");
  const lien = showOnisepLink ? cleanLink(f?.lien) : "";
  const resume = getFormationResume(f);
  const badges = getFormationBadges(f);
  const domainHint = formatFormationDomainHint(f, t);

  return (
    <li className="rec-formation-item">
      <p className="rec-formation-title">{libelle}</p>
      {resume ? <p className="rec-formation-resume">{resume}</p> : null}
      {badges.length > 0 ? (
        <ul className="rec-formation-badges" aria-label={t("formationMetaAria", "Caractéristiques de la formation")}>
          {badges.map((b) => (
            <li key={b.key} className={`rec-formation-badge rec-formation-badge--${b.key}`}>
              {b.label}
            </li>
          ))}
        </ul>
      ) : null}
      {domainHint ? <p className="rec-formation-domain">{domainHint}</p> : null}
      {lien ? (
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

function cleanLink(lien) {
  const u = String(lien || "").trim();
  return u && u.startsWith("http") ? u : "";
}
