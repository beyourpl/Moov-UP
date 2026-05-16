import { Link } from "react-router-dom";
import PartenairesAudienceSwitch from "../components/PartenairesAudienceSwitch.jsx";
import { TopBarAccountTools } from "../components/TopBarAccountTools.jsx";
import { getSession } from "../data/authStorage.js";
import { getStructureEntryPath } from "../data/partenairesSession.js";
import { useTranslation } from "../hooks/useTranslation.js";
import { useNavigateBack } from "../hooks/useNavigateBack.js";

export default function PartenairesIntroPage() {
  const { t } = useTranslation();
  const goBackPage = useNavigateBack("/");
  const session = getSession();
  const structureEntry = session ? getStructureEntryPath() : "/partenaires/connexion";

  return (
    <div className="lp fade-in partenaires-page">
      <header className="lp-header">
        <div className="lp-header-inner">
          <Link to="/" className="lp-logo">
            Moov&apos;Up
          </Link>
          <nav className="lp-nav" aria-label={t("partenaires", "navAria", "Espace partenaires")}>
            <button
              type="button"
              className="lp-nav-back"
              onClick={goBackPage}
              aria-label={t("common", "navBackAria", "Revenir à la page précédente")}
            >
              ← {t("common", "back", "Retour")}
            </button>
            <PartenairesAudienceSwitch active="structures" />
            <Link to="/">{t("common", "home", "Accueil")}</Link>
          </nav>
          <div className="lp-header-cta">
            <TopBarAccountTools className="lp-header-tools" />
            <Link to={structureEntry} className="lp-btn lp-btn-primary">
              {t("partenaires", "ctaLogin", "Connexion structure")}
            </Link>
          </div>
        </div>
      </header>

      <main className="lp-container partenaires-intro">
        <div className="partenaires-intro-hero">
          <p className="lp-eyebrow">{t("partenaires", "eyebrow", "Structures · Missions locales · Établissements")}</p>
          <h1 className="lp-title">{t("partenaires", "title", "Espace missions locales & partenaires")}</h1>
          <p className="lp-lead partenaires-lead">
            {t(
              "partenaires",
              "lead",
              "Tableau de bord collectif pour suivre les jeunes qui ont accepté de partager des indicateurs d’orientation : volume, répartition et tendances — sans exposer les données personnelles hors du cadre prévu."
            )}
          </p>
        </div>

        <div className="partenaires-intro-steps" role="list">
          <article className="partenaires-step-card" role="listitem">
            <span className="partenaires-step-icon" aria-hidden>
              🔐
            </span>
            <p className="partenaires-step-text">
              {t("partenaires", "bullet1", "Connexion réservée aux comptes de votre structure")}
            </p>
          </article>
          <article className="partenaires-step-card" role="listitem">
            <span className="partenaires-step-icon" aria-hidden>
              ✨
            </span>
            <p className="partenaires-step-text">
              {t("partenaires", "bullet2", "Après connexion : choix de l’offre Freemium, Premium ou Licences B2B")}
            </p>
          </article>
          <article className="partenaires-step-card" role="listitem">
            <span className="partenaires-step-icon" aria-hidden>
              📈
            </span>
            <p className="partenaires-step-text">
              {t("partenaires", "bullet3", "Accès au tableau de bord avec les agrégats consentis")}
            </p>
          </article>
        </div>

        <div className="partenaires-intro-actions">
          <Link to={structureEntry} className="lp-btn lp-btn-primary lp-btn-lg">
            {t("partenaires", "ctaLogin", "Connexion structure")}
          </Link>
          {session ? (
            <Link to="/partenaires/offres" className="lp-btn lp-btn-secondary lp-btn-lg">
              {t("partenaires", "ctaOffers", "Voir les offres")}
            </Link>
          ) : null}
        </div>
      </main>
    </div>
  );
}
