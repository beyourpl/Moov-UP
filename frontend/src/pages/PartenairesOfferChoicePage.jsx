import { useMemo } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import PartenairesAudienceSwitch from "../components/PartenairesAudienceSwitch.jsx";
import PartenairesPricingCards from "../components/partenaires/PartenairesPricingCards.jsx";
import { TopBarAccountTools } from "../components/TopBarAccountTools.jsx";
import { getSession, logoutUser } from "../data/authStorage.js";
import { buildPartenairesOfferUi } from "../data/partenairesOfferUi.js";
import { setPartenairesOffer } from "../data/partenairesSession.js";
import { useTranslation } from "../hooks/useTranslation.js";
import { useNavigateBack } from "../hooks/useNavigateBack.js";

export default function PartenairesOfferChoicePage() {
  const navigate = useNavigate();
  const goBackPage = useNavigateBack("/partenaires/connexion");
  const { t } = useTranslation();
  const session = getSession();

  const ui = useMemo(
    () => ({
      eyebrow: t("partenaires", "offersEyebrow", "Choix d’offre"),
      title: t("partenaires", "offersTitle", "Quelle formule correspond à ta structure ?"),
      subtitle: t(
        "partenaires",
        "offersSubtitle",
        "Les jeunes accèdent à Moov’Coach avec une offre adaptée ; les partenaires disposent du tableau de bord avec les indicateurs partagés selon consentement."
      ),
      ...buildPartenairesOfferUi(t),
    }),
    [t]
  );

  const handleLogout = () => {
    logoutUser();
    navigate("/partenaires", { replace: true });
  };

  const pickFreemium = () => {
    setPartenairesOffer("freemium");
    navigate("/choice", { replace: true });
  };

  const pickPremium = () => {
    navigate("/partenaires/souscription/premium-b2c");
  };

  const pickB2b = () => {
    navigate("/partenaires/souscription/licences-b2b");
  };

  if (!session) {
    return <Navigate to="/partenaires/connexion" replace />;
  }

  return (
    <div className="lp fade-in partenaires-page">
      <header className="lp-header">
        <div className="lp-header-inner">
          <Link to="/" className="lp-logo">
            Moov&apos;Up
          </Link>
          <nav className="lp-nav">
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
            <button type="button" className="lp-btn lp-btn-ghost" onClick={handleLogout}>
              {t("common", "logout", "Se déconnecter")}
            </button>
          </div>
        </div>
      </header>

      <main className="lp-container partenaires-offers">
        <header className="partenaires-offers-hero">
          <p className="lp-eyebrow">{ui.eyebrow}</p>
          <h1 className="lp-title" id="partenaires-offers-title">
            {ui.title}
          </h1>
          <p className="lp-lead partenaires-offers-sub">{ui.subtitle}</p>
        </header>

        <div className="partenaires-pricing-grid partenaires-pricing-grid--deck" aria-labelledby="partenaires-offers-title">
          <PartenairesPricingCards
            ui={ui}
            variant="interactive"
            onFreemium={pickFreemium}
            onPremium={pickPremium}
            onB2b={pickB2b}
          />
        </div>
      </main>
    </div>
  );
}
