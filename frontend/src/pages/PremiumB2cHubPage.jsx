import { useMemo } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import PartenairesAudienceSwitch from "../components/PartenairesAudienceSwitch.jsx";
import { TopBarAccountTools } from "../components/TopBarAccountTools.jsx";
import { getSession, logoutUser } from "../data/authStorage.js";
import { getLastConversationId } from "../data/conversationStorage.js";
import { getPartenairesOffer } from "../data/partenairesSession.js";
import { useTranslation } from "../hooks/useTranslation.js";
import { useNavigateBack } from "../hooks/useNavigateBack.js";

export default function PremiumB2cHubPage() {
  const navigate = useNavigate();
  const goBackPage = useNavigateBack("/partenaires/offres");
  const { t } = useTranslation();
  const session = getSession();
  const offer = getPartenairesOffer();

  const assistantHref = useMemo(() => {
    const id = getLastConversationId();
    return id ? `/assistant?cid=${id}` : "/assistant";
  }, []);

  const ui = useMemo(
    () => ({
      wrongOffer: t(
        "partenaires",
        "premiumWrongOffer",
        "Cet espace est réservé à l’offre Premium B2C. Choisis cette offre pour y accéder."
      ),
      goOffers: t("partenaires", "goOffers", "Retour aux offres"),
      home: t("common", "home", "Accueil"),
      hubTitle: t("partenaires", "premiumHubTitle", "Espace Premium B2C"),
      hubLead: t(
        "partenaires",
        "premiumHubLead",
        "Tout ce qui est inclus dans ton abonnement — rappels des avantages et accès directs aux outils."
      ),
      badge: t("partenaires", "offerPremiumBadge", "★ Le plus populaire"),
      offerTitle: t("partenaires", "offerPremiumTitle", "PREMIUM B2C"),
      offerPriceMonthly: t("partenaires", "offerPremiumPriceMonthly", "0,99 € / mois"),
      offerPriceAnnual: t("partenaires", "offerPremiumPriceAnnual", "9,99 € / an"),
      offerDesc: t(
        "partenaires",
        "offerPremiumDesc",
        "Accès illimité, génération CV, outils avancés."
      ),
      includedTitle: t("partenaires", "premiumIncludedTitle", "Inclus dans ton Premium"),
      p1Title: t("partenaires", "offerPremiumF1", "Accès illimité"),
      p1Body: t(
        "partenaires",
        "premiumPillarAccessBody",
        "Questionnaire guidé, résultats et parcours : tout débloqué sans plafond côté expérience (démo)."
      ),
      p2Title: t("partenaires", "offerPremiumF2", "Génération CV & lettre"),
      p2Body: t(
        "partenaires",
        "premiumPillarCvBody",
        "Modèles, analyse IA et suggestions pour aligner ton CV et ta lettre sur les attentes des recruteurs et des ATS."
      ),
      p3Title: t("partenaires", "offerPremiumF3", "Préparation entretiens"),
      p3Body: t(
        "partenaires",
        "premiumPillarInterviewBody",
        "Entraîne-toi avec Moov’Coach : questions types, reformulation, posture et messages clés avant un entretien ou un oral."
      ),
      p4Title: t("partenaires", "offerPremiumF4", "Moov’Coach illimité"),
      p4Body: t(
        "partenaires",
        "premiumPillarCoachBody",
        "Pose autant de questions que tu veux sur les métiers, formations et filières — le coach s’appuie sur des sources fiables."
      ),
      ctaQuiz: t("partenaires", "premiumCtaQuiz", "Ouvrir le parcours guidé"),
      ctaCv: t("partenaires", "premiumCtaCv", "Ouvrir CV & lettre"),
      ctaInterview: t("partenaires", "premiumCtaInterview", "Préparer un entretien"),
      ctaCoach: t("partenaires", "premiumCtaCoach", "Ouvrir Moov’Coach"),
      demoNote: t(
        "partenaires",
        "premiumDemoNote",
        "Paiement réel et plafonds serveur : à brancher sur ton offre commerciale ; ici l’accès « illimité » est une démonstration côté interface."
      ),
      currentOfferBanner: t(
        "partenaires",
        "currentOfferPremiumBanner",
        "Offre active : Premium B2C — 0,99 € TTC / mois ou 9,99 € TTC / an. Aucun prélèvement réel en mode démonstration ; le paiement en ligne sera branché ensuite."
      ),
    }),
    [t]
  );

  const handleLogout = () => {
    logoutUser();
    navigate("/", { replace: true });
  };

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!offer || offer.offer !== "premium_b2c") {
    return (
      <div className="lp fade-in partenaires-page">
        <main className="lp-container partenaires-dash-gate partenaires-dash-gate--solo">
          <p className="lp-lead">{ui.wrongOffer}</p>
          <Link to="/partenaires/offres" className="lp-btn lp-btn-primary">
            {ui.goOffers}
          </Link>
        </main>
      </div>
    );
  }

  const pillars = [
    { id: "access", icon: "✨", title: ui.p1Title, body: ui.p1Body, href: "/demo", cta: ui.ctaQuiz },
    { id: "cv", icon: "📄", title: ui.p2Title, body: ui.p2Body, href: "/cvlm", cta: ui.ctaCv },
    {
      id: "interview",
      icon: "🎤",
      title: ui.p3Title,
      body: ui.p3Body,
      href: assistantHref,
      cta: ui.ctaInterview,
    },
    { id: "coach", icon: "💬", title: ui.p4Title, body: ui.p4Body, href: assistantHref, cta: ui.ctaCoach },
  ];

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
            <Link to="/">{ui.home}</Link>
            <Link to="/partenaires/offres">{ui.goOffers}</Link>
          </nav>
          <div className="lp-header-cta">
            <TopBarAccountTools className="lp-header-tools" />
            <button type="button" className="lp-btn lp-btn-ghost" onClick={handleLogout}>
              {t("common", "logout", "Se déconnecter")}
            </button>
          </div>
        </div>
      </header>

      <main className="lp-container premium-b2c-hub">
        <div className="partenaires-current-offer-banner partenaires-current-offer-banner--premium" role="status">
          {ui.currentOfferBanner}
        </div>
        <h1 className="lp-title premium-hub-main-title">{ui.hubTitle}</h1>
        <p className="lp-lead premium-hub-lead">{ui.hubLead}</p>

        <section className="premium-contract-hero" aria-labelledby="premium-contract-heading">
          <p className="premium-contract-badge-floating">{ui.badge}</p>
          <p id="premium-contract-heading" className="premium-contract-badge">
            {ui.offerTitle}
          </p>
          <div className="pricing-price-stack premium-contract-prices">
            <p className="premium-contract-price">{ui.offerPriceMonthly}</p>
            <p className="premium-contract-price-secondary">{ui.offerPriceAnnual}</p>
          </div>
          <p className="premium-contract-audience">{ui.offerDesc}</p>
        </section>

        <section className="premium-pillars" aria-labelledby="premium-pillars-heading">
          <h2 id="premium-pillars-heading" className="partenaires-subh premium-pillars-heading">
            {ui.includedTitle}
          </h2>
          <ul className="premium-pillars-grid">
            {pillars.map((p) => (
              <li key={p.id} className="premium-pillar-card">
                <span className="premium-pillar-icon" aria-hidden>
                  {p.icon}
                </span>
                <h3 className="premium-pillar-title">{p.title}</h3>
                <p className="premium-pillar-body">{p.body}</p>
                <Link to={p.href} className="lp-btn lp-btn-primary lp-btn-lg premium-pillar-cta">
                  {p.cta}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="premium-demo-note">{ui.demoNote}</p>
      </main>
    </div>
  );
}
