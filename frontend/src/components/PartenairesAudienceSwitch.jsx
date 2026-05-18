import { Link } from "react-router-dom";
import { useTranslation } from "../hooks/useTranslation.js";

/**
 * Bascule visuelle entre l’espace structures (missions locales / partenaires)
 * et l’espace jeunes (connexion classique).
 */
export default function PartenairesAudienceSwitch({ active = "structures" }) {
  const { t } = useTranslation();
  const structs = t("partenaires", "navSegmentStructures", "Structures");
  const jeunes = t("partenaires", "navSegmentJeunes", "Jeunes");
  const aria = t(
    "partenaires",
    "navAudienceSwitchAria",
    "Choisir l’espace Structures ou Jeunes"
  );

  return (
    <div className="partenaires-audience-switch" role="group" aria-label={aria}>
      <Link
        to="/partenaires"
        className={active === "structures" ? "is-active" : undefined}
        aria-current={active === "structures" ? "page" : undefined}
      >
        <span className="partenaires-audience-switch-icon" aria-hidden="true">
          🏢
        </span>
        <span className="partenaires-audience-switch-label">{structs}</span>
      </Link>
      <Link
        to="/jeunes"
        className={active === "jeunes" ? "is-active" : undefined}
        aria-current={active === "jeunes" ? "page" : undefined}
      >
        <span className="partenaires-audience-switch-icon" aria-hidden="true">
          🎓
        </span>
        <span className="partenaires-audience-switch-label">{jeunes}</span>
      </Link>
    </div>
  );
}
