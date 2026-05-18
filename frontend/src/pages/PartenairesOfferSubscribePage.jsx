import { useMemo } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import PartenairesAudienceSwitch from "../components/PartenairesAudienceSwitch.jsx";
import { TopBarAccountTools } from "../components/TopBarAccountTools.jsx";
import { getSession, logoutUser } from "../data/authStorage.js";
import { getPartenairesOffer, setPartenairesOffer } from "../data/partenairesSession.js";
import { useTranslation } from "../hooks/useTranslation.js";
import { useNavigateBack } from "../hooks/useNavigateBack.js";

const SLUGS = /** @type {const} */ (["premium-b2c", "licences-b2b"]);

/** Très petit sous-ensemble **gras** markdown → HTML pour les textes traduits. */
function renderMdBold(s) {
  return String(s || "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function SubscribeActions({ mode, onActivatePremium, onActivateB2b, ui, t }) {
  const current = getPartenairesOffer()?.offer;

  if (mode === "premium" && current === "premium_b2c") {
    return (
      <div className="partenaires-subscribe-actions">
        <p className="partenaires-subscribe-already">{ui.already}</p>
        <div className="partenaires-subscribe-btn-row">
          <Link to="/partenaires/premium" className="lp-btn lp-btn-primary lp-btn-lg">
            {ui.goHub}
          </Link>
          <Link to="/partenaires/offres" className="lp-btn lp-btn-secondary lp-btn-lg">
            {t("partenaires", "goOffers", "Retour aux offres")}
          </Link>
        </div>
      </div>
    );
  }

  if (mode === "b2b" && current === "licences_b2b") {
    return (
      <div className="partenaires-subscribe-actions">
        <p className="partenaires-subscribe-already">{ui.already}</p>
        <div className="partenaires-subscribe-btn-row">
          <Link to="/partenaires/tableau-de-bord" className="lp-btn lp-btn-primary lp-btn-lg">
            {ui.goHub}
          </Link>
          <Link to="/partenaires/offres" className="lp-btn lp-btn-secondary lp-btn-lg">
            {t("partenaires", "goOffers", "Retour aux offres")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="partenaires-subscribe-actions">
      <div className="partenaires-subscribe-btn-row">
        {mode === "premium" ? (
          <button type="button" className="lp-btn lp-btn-primary lp-btn-lg" onClick={onActivatePremium}>
            {ui.activate}
          </button>
        ) : (
          <button type="button" className="lp-btn lp-btn-primary lp-btn-lg" onClick={onActivateB2b}>
            {ui.activate}
          </button>
        )}
        <Link to="/partenaires/offres" className="lp-btn lp-btn-ghost lp-btn-lg">
          {t("partenaires", "subscribeBackOffers", "Retour au choix des offres")}
        </Link>
      </div>
    </div>
  );
}

export default function PartenairesOfferSubscribePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const goBackPage = useNavigateBack("/partenaires/offres");
  const { t } = useTranslation();
  const session = getSession();

  const mode = useMemo(() => {
    if (slug === "premium-b2c") return "premium";
    if (slug === "licences-b2b") return "b2b";
    return null;
  }, [slug]);

  const ui = useMemo(() => {
    if (mode === "premium") {
      return {
        kind: "premium",
        title: t("partenaires", "subscribePremiumTitle", "Premium B2C — comment ça se passe ?"),
        lead: t(
          "partenaires",
          "subscribePremiumLead",
          "Voici le fonctionnement prévu une fois le paiement en ligne branché. Aujourd’hui tu actives l’offre en **mode démonstration** (sans prélèvement)."
        ),
        priceLine: t(
          "partenaires",
          "subscribePremiumPriceLine",
          "Tarifs affichés : **0,99 € TTC / mois** ou **9,99 € TTC / an** — abonnement avec renouvellement automatique, résiliable."
        ),
        h1: t("partenaires", "subscribePremiumH1", "Modalités de paiement"),
        p1: t(
          "partenaires",
          "subscribePremiumP1",
          "Tu règles par **carte bancaire** (prestataire de paiement sécurisé type Stripe) : première validation, puis prélèvement mensuel le même jour chaque mois."
        ),
        p2: t(
          "partenaires",
          "subscribePremiumP2",
          "Tu reçois un **reçu ou facture** par email après chaque paiement ; tu peux mettre à jour ta carte ou ton adresse de facturation depuis ton compte."
        ),
        p3: t(
          "partenaires",
          "subscribePremiumP3",
          "En cas d’échec de paiement, l’accès Premium peut être **suspendu** jusqu’à régularisation — tu es notifié par email."
        ),
        p4: t(
          "partenaires",
          "subscribePremiumP4",
          "Les fonctionnalités « illimitées » côté interface sont **démo** : les plafonds réels dépendront du contrat branché sur l’infra."
        ),
        legal: t(
          "partenaires",
          "subscribePremiumLegal",
          "Conditions contractuelles définitives (CGV, durée, résiliation) : à fournir par ton équipe juridique / commerciale."
        ),
        activate: t("partenaires", "subscribePremiumActivate", "Activer l’offre Premium (démo)"),
        already: t(
          "partenaires",
          "subscribeAlreadyPremium",
          "Tu es déjà sur l’offre Premium B2C. Tu peux ouvrir ton espace ou revenir aux offres."
        ),
        goHub: t("partenaires", "subscribeGoPremiumHub", "Ouvrir l’espace Premium"),
      };
    }
    if (mode === "b2b") {
      return {
        kind: "b2b",
        title: t("partenaires", "subscribeB2bTitle", "Licences B2B/B2G — comment ça se passe ?"),
        lead: t(
          "partenaires",
          "subscribeB2bLead",
          "Les **licences annuelles** se négocient avec l’équipe commerciale : devis, bon de commande ou contrat-cadre, puis facturation."
        ),
        priceLine: t(
          "partenaires",
          "subscribeB2bPriceLine",
          "À partir de **8 € HT / jeune / an** selon périmètre (volume de jeunes, sites, options)."
        ),
        h1: t("partenaires", "subscribeB2bH1", "Modalités de facturation"),
        p1: t(
          "partenaires",
          "subscribeB2bP1",
          "Après signature, tu reçois une **facture** et l’activation des comptes structures (référents, SSO ou listes d’emails selon le setup)."
        ),
        p2: t(
          "partenaires",
          "subscribeB2bP2",
          "Le **tableau de bord collectif** et les exports avancés sont inclus dans les licences ; l’accompagnement dédié est planifié avec ton interlocuteur Moov’Up."
        ),
        p3: t(
          "partenaires",
          "subscribeB2bP3",
          "Ici tu actives les licences en **mode démonstration** pour parcourir l’interface sans contrat réel."
        ),
        p4: "",
        legal: t(
          "partenaires",
          "subscribeB2bLegal",
          "Pour un devis réel : contacte l’équipe licences depuis le tableau de bord (lien support)."
        ),
        activate: t("partenaires", "subscribeB2bActivate", "Activer les licences B2B/B2G (démo)"),
        already: t(
          "partenaires",
          "subscribeAlreadyB2b",
          "Tu es déjà sur l’offre Licences B2B/B2G. Tu peux ouvrir le tableau de bord ou revenir aux offres."
        ),
        goHub: t("partenaires", "subscribeGoB2bDashboard", "Ouvrir le tableau de bord"),
      };
    }
    return null;
  }, [mode, t]);

  const handleLogout = () => {
    logoutUser();
    navigate("/partenaires", { replace: true });
  };

  const activatePremium = () => {
    setPartenairesOffer("premium_b2c");
    navigate("/partenaires/premium", { replace: true });
  };

  const activateB2b = () => {
    setPartenairesOffer("licences_b2b");
    navigate("/partenaires/tableau-de-bord", { replace: true });
  };

  if (!session) {
    return <Navigate to="/partenaires/connexion" replace />;
  }

  if (!mode || typeof slug !== "string" || !SLUGS.includes(slug)) {
    return <Navigate to="/partenaires/offres" replace />;
  }

  if (!ui) {
    return <Navigate to="/partenaires/offres" replace />;
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
            <Link to="/partenaires/offres">{t("partenaires", "goOffers", "Retour aux offres")}</Link>
          </nav>
          <div className="lp-header-cta">
            <TopBarAccountTools className="lp-header-tools" />
            <button type="button" className="lp-btn lp-btn-ghost" onClick={handleLogout}>
              {t("common", "logout", "Se déconnecter")}
            </button>
          </div>
        </div>
      </header>

      <main className="lp-container partenaires-subscribe-main">
        <article className="partenaires-subscribe-panel">
          <h1 className="lp-title partenaires-subscribe-title">{ui.title}</h1>
          <p className="lp-lead partenaires-subscribe-lead" dangerouslySetInnerHTML={{ __html: renderMdBold(ui.lead) }} />
          <p
            className="partenaires-subscribe-price-line"
            dangerouslySetInnerHTML={{ __html: renderMdBold(ui.priceLine) }}
          />

          <section className="partenaires-subscribe-body" aria-labelledby="subscribe-how-heading">
            <h2 id="subscribe-how-heading" className="partenaires-subscribe-h2">
              {ui.h1}
            </h2>
            <ul className="partenaires-subscribe-list">
              {[ui.p1, ui.p2, ui.p3, ui.p4].filter(Boolean).map((p, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: renderMdBold(p) }} />
              ))}
            </ul>
            <p className="partenaires-subscribe-legal">{ui.legal}</p>
          </section>

          <SubscribeActions
            mode={ui.kind}
            onActivatePremium={activatePremium}
            onActivateB2b={activateB2b}
            ui={ui}
            t={t}
          />
        </article>
      </main>
    </div>
  );
}
