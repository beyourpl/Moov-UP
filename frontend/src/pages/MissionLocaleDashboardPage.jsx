import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import PartenairesAudienceSwitch from "../components/PartenairesAudienceSwitch.jsx";
import { TopBarAccountTools } from "../components/TopBarAccountTools.jsx";
import { getSession, logoutUser } from "../data/authStorage.js";
import { getPartenairesOffer } from "../data/partenairesSession.js";
import { useTranslation } from "../hooks/useTranslation.js";
import { useNavigateBack } from "../hooks/useNavigateBack.js";

const B2B_SUPPORT_EMAIL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_B2B_LICENCE_EMAIL) || "licences@moovup.site";

/** Données de démo : agrégats tels qu’un partenaire pourrait les voir sous consentement. */
const DEMO_AGGREGATE = {
  totalOptIn: 842,
  last30Days: 63,
  byAge: [
    { label: "16–17", pct: 28 },
    { label: "18–20", pct: 34 },
    { label: "21–24", pct: 22 },
    { label: "25–30", pct: 16 },
  ],
  byTrack: [
    { label: "Techno / numérique", pct: 31 },
    { label: "Santé & social", pct: 19 },
    { label: "Commerce & gestion", pct: 17 },
    { label: "Industrie & ingénierie", pct: 14 },
    { label: "Autre / en exploration", pct: 19 },
  ],
  engagement: { quizCompleted: 76, coachSessions: 41, cvToolOpens: 52 },
};

const REPORT_CARD_KEYS = [
  {
    title: "reportCard1Title",
    period: "reportCard1Period",
    s1: "reportCard1Stat1",
    s2: "reportCard1Stat2",
  },
  {
    title: "reportCard2Title",
    period: "reportCard2Period",
    s1: "reportCard2Stat1",
    s2: "reportCard2Stat2",
  },
  {
    title: "reportCard3Title",
    period: "reportCard3Period",
    s1: "reportCard3Stat1",
    s2: "reportCard3Stat2",
  },
];

export default function MissionLocaleDashboardPage() {
  const navigate = useNavigate();
  const goBackPage = useNavigateBack("/partenaires/offres");
  const { t } = useTranslation();
  const session = getSession();
  const offer = getPartenairesOffer();
  const [tab, setTab] = useState("overview");

  const ui = useMemo(
    () => ({
      title: t("partenaires", "dashTitle", "Tableau de bord partenaire"),
      workspaceEyebrow: t(
        "partenaires",
        "eyebrow",
        "Structures · Missions locales · Établissements"
      ),
      lead: t(
        "partenaires",
        "dashLead",
        "Indicateurs agrégés à partir des jeunes qui ont accepté le partage pour ton périmètre (démonstration)."
      ),
      tabOverview: t("partenaires", "tabOverview", "Vue d’ensemble"),
      tabConsent: t("partenaires", "tabConsent", "Données partagées"),
      tabCohorts: t("partenaires", "tabCohorts", "Cohortes"),
      tabReports: t("partenaires", "tabReports", "Rapports"),
      optInTotal: t("partenaires", "metricOptIn", "Jeunes avec partage actif"),
      optIn30: t("partenaires", "metric30d", "Nouveaux consentements (30 j)"),
      ageTitle: t("partenaires", "chartAge", "Répartition par âge"),
      trackTitle: t("partenaires", "chartTrack", "Familles de parcours (agrégé)"),
      engagementTitle: t("partenaires", "engagementTitle", "Engagement plateforme"),
      qQuiz: t("partenaires", "engQuiz", "Questionnaire complété"),
      qCoach: t("partenaires", "engCoach", "Sessions Moov’Coach"),
      qCv: t("partenaires", "engCv", "Outil CV / LM ouvert"),
      consentBlurb: t(
        "partenaires",
        "consentBlurb",
        "Seules les statistiques agrégées et anonymisées apparaissent ici. Les dossiers individuels ne sont pas listés dans ce prototype."
      ),
      cohortBlurb: t(
        "partenaires",
        "cohortBlurb",
        "Les cohortes regroupent des jeunes par période d’entrée et niveau déclaratif — utile pour suivre l’évolution sur plusieurs mois (données illustratives)."
      ),
      wrongOffer: t(
        "partenaires",
        "wrongOffer",
        "Le tableau de bord collectif est inclus dans l’offre Licences B2B. Choisis cette offre pour y accéder."
      ),
      goOffers: t("partenaires", "goOffers", "Retour aux offres"),
      home: t("common", "home", "Accueil"),
      offerB2bTitle: t("partenaires", "offerB2bTitle", "LICENCES B2B"),
      offerB2bPrice: t("partenaires", "offerB2bPrice", "À partir de 2 000€ / an"),
      offerB2bDesc: t(
        "partenaires",
        "offerB2bDesc",
        "Réservé aux lycées, missions locales, structures d’insertion, grandes structures."
      ),
      dashIncludedTitle: t("partenaires", "dashIncludedTitle", "Inclus dans les Licences B2B"),
      pillarCollectiveTitle: t("partenaires", "offerB2bF1", "Tableau de bord collectif"),
      pillarCollectiveBody: t(
        "partenaires",
        "pillarCollectiveBody",
        "Indicateurs agrégés sur les jeunes qui ont consenti au partage dans ton périmètre : volumes, répartition, tendances — sans exposer les dossiers nominatifs."
      ),
      pillarCohortsTitle: t("partenaires", "offerB2bF2", "Suivi de cohortes"),
      pillarCohortsBody: t(
        "partenaires",
        "pillarCohortsBody",
        "Suivi par période d’entrée : effectifs, actifs sur 30 jours, évolution dans le temps pour piloter tes actions locales."
      ),
      pillarReportsTitle: t("partenaires", "offerB2bF3", "Rapports et statistiques"),
      pillarReportsBody: t(
        "partenaires",
        "pillarReportsBody",
        "Rapports et statistiques périodiques pour ton pilotage interne et tes instances de gouvernance (exports illustratifs ci-dessous)."
      ),
      pillarSupportTitle: t("partenaires", "offerB2bF4", "Accompagnement dédié"),
      pillarSupportBody: t(
        "partenaires",
        "pillarSupportBody",
        "Un interlocuteur Moov’Up dédié : démarrage, formation des équipes, bonnes pratiques et escalade opérationnelle."
      ),
      reportsIntro: t(
        "partenaires",
        "reportsIntro",
        "Aperçu des derniers rapports disponibles — données de démonstration, les exports réels seront branchés sur ton contrat."
      ),
      reportViewSummary: t("partenaires", "reportViewSummary", "Voir le résumé"),
      reportDemoNote: t("partenaires", "reportDemoNote", "Export PDF : disponible avec intégration entreprise."),
      supportTitle: t("partenaires", "supportTitle", "Accompagnement dédié"),
      supportLead: t(
        "partenaires",
        "supportLead",
        "Équipe licences : onboarding de la structure, médiation et montée en compétence des référents orientation."
      ),
      supportCta: t("partenaires", "supportCta", "Écrire à l’équipe licences"),
      supportEmailSubject: t("partenaires", "supportEmailSubject", "Demande Licences B2B — Moov’Up"),
      pillarCtaOverview: t("partenaires", "pillarCtaOverview", "Ouvrir la vue d’ensemble"),
      pillarCtaCohorts: t("partenaires", "pillarCtaCohorts", "Ouvrir le suivi des cohortes"),
      pillarCtaReports: t("partenaires", "pillarCtaReports", "Ouvrir les rapports"),
      pillarCtaSupport: t("partenaires", "pillarCtaSupport", "Contacter l’équipe licences"),
      currentOfferB2bBanner: t(
        "partenaires",
        "currentOfferB2bBanner",
        "Offre active : Licences B2B — à partir de 2 000 € HT / an. Activation démo : pas de contrat ni facturation réelle tant que l’équipe commerciale n’a pas finalisé ton dossier."
      ),
    }),
    [t]
  );

  const reportCards = useMemo(
    () =>
      REPORT_CARD_KEYS.map((keys) => ({
        title: t("partenaires", keys.title, keys.title),
        period: t("partenaires", keys.period, keys.period),
        s1: t("partenaires", keys.s1, keys.s1),
        s2: t("partenaires", keys.s2, keys.s2),
      })),
    [t]
  );

  const supportMailto = useMemo(() => {
    const q = new URLSearchParams({ subject: ui.supportEmailSubject });
    return `mailto:${B2B_SUPPORT_EMAIL}?${q.toString()}`;
  }, [ui.supportEmailSubject]);

  const handleLogout = () => {
    logoutUser();
    navigate("/partenaires", { replace: true });
  };

  if (!session) {
    return <Navigate to="/partenaires/connexion" replace />;
  }

  if (!offer || offer.offer !== "licences_b2b") {
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

  const d = DEMO_AGGREGATE;

  const pillars = [
    { icon: "📊", title: ui.pillarCollectiveTitle, body: ui.pillarCollectiveBody, cta: ui.pillarCtaOverview, tab: "overview" },
    { icon: "📅", title: ui.pillarCohortsTitle, body: ui.pillarCohortsBody, cta: ui.pillarCtaCohorts, tab: "cohorts" },
    { icon: "📑", title: ui.pillarReportsTitle, body: ui.pillarReportsBody, cta: ui.pillarCtaReports, tab: "reports" },
    {
      icon: "🤝",
      title: ui.pillarSupportTitle,
      body: ui.pillarSupportBody,
      cta: ui.pillarCtaSupport,
      tab: null,
    },
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

      <main className="lp-container partenaires-dashboard">
        <div className="partenaires-current-offer-banner partenaires-current-offer-banner--b2b" role="status">
          {ui.currentOfferB2bBanner}
        </div>
        <section className="b2b-contract-hero" aria-labelledby="b2b-contract-heading">
          <p id="b2b-contract-heading" className="b2b-contract-badge">
            {ui.offerB2bTitle}
          </p>
          <p className="b2b-contract-price">{ui.offerB2bPrice}</p>
          <p className="b2b-contract-audience">{ui.offerB2bDesc}</p>
        </section>

        <section className="b2b-pillars" aria-labelledby="b2b-pillars-heading">
          <h2 id="b2b-pillars-heading" className="partenaires-subh b2b-pillars-heading">
            {ui.dashIncludedTitle}
          </h2>
          <ul className="b2b-pillars-grid">
            {pillars.map((p) => (
              <li key={p.title} className="b2b-pillar-card">
                <span className="b2b-pillar-icon" aria-hidden>
                  {p.icon}
                </span>
                <h3 className="b2b-pillar-title">{p.title}</h3>
                <p className="b2b-pillar-body">{p.body}</p>
                {p.tab ? (
                  <button
                    type="button"
                    className={`b2b-pillar-link${tab === p.tab ? " is-current" : ""}`}
                    onClick={() => {
                      setTab(p.tab);
                      requestAnimationFrame(() =>
                        document.querySelector(".partenaires-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" })
                      );
                    }}
                  >
                    {p.cta}
                  </button>
                ) : (
                  <a href={supportMailto} className="b2b-pillar-link b2b-pillar-link--external">
                    {p.cta}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="partenaires-dash-hero" aria-labelledby="b2b-dash-heading">
          <p className="partenaires-dash-hero-eyebrow">{ui.workspaceEyebrow}</p>
          <h1 id="b2b-dash-heading" className="partenaires-dash-hero-title">
            {ui.title}
          </h1>
          <p className="partenaires-dash-hero-lead">{ui.lead}</p>
          {session?.pseudo ? (
            <p className="partenaires-org-pill partenaires-org-pill--hero">
              {t("partenaires", "connectedAs", "Connecté :")} {session.pseudo}
            </p>
          ) : null}
        </section>

        <div className="partenaires-dash-workspace">
          <div className="partenaires-tabs" role="tablist" aria-label={ui.title}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "overview"}
              className={tab === "overview" ? "is-active" : ""}
              onClick={() => setTab("overview")}
            >
              {ui.tabOverview}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "consent"}
              className={tab === "consent" ? "is-active" : ""}
              onClick={() => setTab("consent")}
            >
              {ui.tabConsent}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "cohorts"}
              className={tab === "cohorts" ? "is-active" : ""}
              onClick={() => setTab("cohorts")}
            >
              {ui.tabCohorts}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "reports"}
              className={tab === "reports" ? "is-active" : ""}
              onClick={() => setTab("reports")}
            >
              {ui.tabReports}
            </button>
          </div>

          <div className="partenaires-panels">
            {tab === "overview" ? (
              <>
                <div className="dash-stat-grid">
                  <div className="dash-stat-card">
                    <span className="dash-stat-value">{d.totalOptIn}</span>
                    <span className="dash-stat-label">{ui.optInTotal}</span>
                  </div>
                  <div className="dash-stat-card">
                    <span className="dash-stat-value">{d.last30Days}</span>
                    <span className="dash-stat-label">{ui.optIn30}</span>
                  </div>
                </div>
                <h2 className="partenaires-subh partenaires-subh--tight">{ui.ageTitle}</h2>
                <div className="dash-bars dash-bars--card">
                  {d.byAge.map((row) => (
                    <div key={row.label} className="dash-bar-row">
                      <span className="dash-bar-label">{row.label}</span>
                      <div className="dash-bar-track">
                        <div className="dash-bar-fill" style={{ width: `${row.pct}%` }} />
                      </div>
                      <span className="dash-bar-pct">{row.pct}%</span>
                    </div>
                  ))}
                </div>
                <h2 className="partenaires-subh">{ui.trackTitle}</h2>
                <div className="dash-bars dash-bars--card">
                  {d.byTrack.map((row) => (
                    <div key={row.label} className="dash-bar-row">
                      <span className="dash-bar-label">{row.label}</span>
                      <div className="dash-bar-track">
                        <div className="dash-bar-fill dash-bar-fill--alt" style={{ width: `${row.pct}%` }} />
                      </div>
                      <span className="dash-bar-pct">{row.pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {tab === "consent" ? (
              <>
                <p className="partenaires-prose">{ui.consentBlurb}</p>
                <h2 className="partenaires-subh partenaires-subh--tight">{ui.engagementTitle}</h2>
                <ul className="dash-list">
                  <li>
                    <strong>{d.engagement.quizCompleted}%</strong> — {ui.qQuiz}
                  </li>
                  <li>
                    <strong>{d.engagement.coachSessions}%</strong> — {ui.qCoach}
                  </li>
                  <li>
                    <strong>{d.engagement.cvToolOpens}%</strong> — {ui.qCv}
                  </li>
                </ul>
              </>
            ) : null}

            {tab === "cohorts" ? (
              <>
                <p className="partenaires-prose">{ui.cohortBlurb}</p>
                <div className="dash-table-wrap">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>{t("partenaires", "cohortPeriod", "Période")}</th>
                        <th>{t("partenaires", "cohortSize", "Effectif")}</th>
                        <th>{t("partenaires", "cohortActive", "Actifs 30 j.")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Jan–Mar 2026</td>
                        <td>214</td>
                        <td>58%</td>
                      </tr>
                      <tr>
                        <td>Oct–Déc 2025</td>
                        <td>189</td>
                        <td>44%</td>
                      </tr>
                      <tr>
                        <td>Juil–Sep 2025</td>
                        <td>156</td>
                        <td>39%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}

            {tab === "reports" ? (
              <>
                <p className="partenaires-prose">{ui.reportsIntro}</p>
                <div className="b2b-report-grid">
                  {reportCards.map((card) => (
                    <article key={card.title} className="b2b-report-card">
                      <h2 className="b2b-report-card-title">{card.title}</h2>
                      <p className="b2b-report-card-period">{card.period}</p>
                      <ul className="b2b-report-card-stats">
                        <li>{card.s1}</li>
                        <li>{card.s2}</li>
                      </ul>
                      <button type="button" className="lp-btn lp-btn-secondary lp-btn-lg b2b-report-btn" disabled>
                        {ui.reportViewSummary}
                      </button>
                      <p className="b2b-report-note">{ui.reportDemoNote}</p>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>

        <section className="b2b-support-panel" aria-labelledby="b2b-support-heading">
          <h2 id="b2b-support-heading" className="partenaires-subh">
            {ui.supportTitle}
          </h2>
          <p className="partenaires-prose">{ui.supportLead}</p>
          <p className="b2b-support-email">
            <a href={supportMailto} className="lp-btn lp-btn-primary">
              {ui.supportCta}
            </a>
            <span className="b2b-support-address">{B2B_SUPPORT_EMAIL}</span>
          </p>
        </section>
      </main>
    </div>
  );
}
