import { Link } from "react-router-dom";
import PartenairesAudienceSwitch from "../components/PartenairesAudienceSwitch.jsx";
import { TopBarAccountTools } from "../components/TopBarAccountTools.jsx";
import { getSession } from "../data/authStorage.js";
import { getPostAuthLandingPath } from "../data/partenairesSession.js";
import { useTranslation } from "../hooks/useTranslation.js";
import { useNavigateBack } from "../hooks/useNavigateBack.js";
import moovupLogoSquare from "../assets/moovup-logo-square.png";

export default function JeunesIntroPage() {
  const { t } = useTranslation();
  const goBackPage = useNavigateBack("/");
  const session = getSession();
  const youthEntry = session ? getPostAuthLandingPath() : "/auth";

  return (
    <div className="lp fade-in jeunes-page">
      <header className="lp-header">
        <div className="lp-header-inner">
          <Link to="/jeunes" className="lp-logo lp-logo--mark" aria-label={t("coach", "brandHomeAria", "Moov'Up — accueil jeunes")}>
            <img
              src={moovupLogoSquare}
              alt=""
              className="lp-logo-img"
              width={48}
              height={48}
              decoding="async"
            />
          </Link>
          <nav className="lp-nav" aria-label={t("a11y", "mainNav", "Navigation principale")}>
            <button
              type="button"
              className="lp-nav-back"
              onClick={goBackPage}
              aria-label={t("common", "navBackAria", "Revenir à la page précédente")}
            >
              ← {t("common", "back", "Retour")}
            </button>
            <PartenairesAudienceSwitch active="jeunes" />
            <Link to="/">{t("landing", "navFullSite", "Site complet")}</Link>
          </nav>
          <div className="lp-header-cta">
            <TopBarAccountTools className="lp-header-tools" />
            <Link to={youthEntry} className="lp-btn lp-btn-primary">
              {session
                ? t("jeunes", "ctaContinue", "Continuer mon parcours")
                : t("auth", "login", "Connexion")}
            </Link>
          </div>
        </div>
      </header>

      <main className="lp-container jeunes-intro">
        <div className="jeunes-intro-hero">
          <p className="lp-eyebrow jeunes-eyebrow">
            {t("jeunes", "eyebrow", "16–30 ans · Orientation · Emploi")}
          </p>
          <h1 className="lp-title">{t("jeunes", "title", "Ton espace Moov'Up")}</h1>
          <p className="lp-lead jeunes-lead">
            {t(
              "jeunes",
              "lead",
              "Questionnaire guidé, Moov'Coach et analyse CV & lettre : tout pour avancer dans ton orientation, à ton rythme."
            )}
          </p>
        </div>

        <div className="jeunes-intro-steps" role="list">
          <article className="jeunes-step-card" role="listitem">
            <span className="jeunes-step-icon" aria-hidden>
              🧭
            </span>
            <p className="jeunes-step-text">
              {t("jeunes", "bullet1", "Parcours en 10 questions pour clarifier ton profil")}
            </p>
          </article>
          <article className="jeunes-step-card" role="listitem">
            <span className="jeunes-step-icon" aria-hidden>
              💬
            </span>
            <p className="jeunes-step-text">
              {t("jeunes", "bullet2", "Moov'Coach : pose tes questions, reçois des pistes concrètes")}
            </p>
          </article>
          <article className="jeunes-step-card" role="listitem">
            <span className="jeunes-step-icon" aria-hidden>
              📄
            </span>
            <p className="jeunes-step-text">
              {t("jeunes", "bullet3", "CV & lettre de motivation analysés par l'IA")}
            </p>
          </article>
        </div>

        <div className="jeunes-intro-actions">
          <Link to={youthEntry} className="lp-btn lp-btn-primary lp-btn-lg">
            {session
              ? t("jeunes", "ctaContinue", "Continuer mon parcours")
              : t("jeunes", "ctaStart", "Commencer gratuitement")}
          </Link>
          <Link to="/" className="lp-btn lp-btn-secondary lp-btn-lg">
            {t("landing", "navFullSite", "Découvrir le site")}
          </Link>
        </div>
      </main>
    </div>
  );
}