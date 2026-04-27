import { Link, useNavigate } from "react-router-dom";
import { TopBarAccountTools } from "../components/TopBarAccountTools.jsx";
import { getSession, logoutUser } from "../data/authStorage.js";
import { useTranslation } from "../hooks/useTranslation.js";

const GOOGLE_DEMO_URL = "https://forms.gle/QRdjqLB7D7kgnfZo7";
const VIDEO_EMBED_URL = "";

const FOUNDERS = [
  { name: "Hassna Marjane", roleKey: "founder1Role", roleFallback: "Co-fondatrice · Data Scientist", initial: "H" },
  { name: "Jalis Shoul", roleKey: "founder2Role", roleFallback: "Co-fondateur · Data Scientist", initial: "J" },
  { name: "Leila Serhir", roleKey: "founder3Role", roleFallback: "Co-fondatrice · PMO / Cheffe de projet", initial: "L" },
  { name: "Ayoub Touati", roleKey: "founder4Role", roleFallback: "Co-fondateur · Data Analyst", initial: "A" },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const session = getSession();
  const { t } = useTranslation();

  const goGuided = () => navigate(session ? "/demo" : "/auth");
  const goTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const handleLogin = () => navigate("/auth");
  const handleLogout = () => {
    logoutUser();
    navigate("/", { replace: true });
    window.location.reload();
  };

  return (
    <div className="lp fade-in">
      {/* ─── HEADER ─── */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <Link to="/" className="lp-logo">Moov&apos;Up</Link>
          <nav className="lp-nav" aria-label={t("a11y", "mainNav", "Navigation principale")}>
            <a href="#fondateurs">{t("landing", "navCoFounders", "Co-fondateurs")}</a>
            <a href="#produit">{t("landing", "navProduct", "Produit")}</a>
            <a href="#parcours">{t("landing", "navSteps", "Comment ça marche")}</a>
            <a href="#faq">{t("landing", "navFaq", "FAQ")}</a>
          </nav>
          <div className="lp-header-cta">
            <TopBarAccountTools showGuestLabel={false} className="lp-header-tools" />
            <button type="button" className="lp-btn lp-btn-primary" onClick={goGuided}>
              {t("landing", "ctaPrimary", "Lancer le parcours")}
            </button>
            {session ? (
              <button
                type="button"
                className="lp-btn lp-btn-auth lp-btn-logout"
                onClick={handleLogout}
                aria-label={t("common", "logout", "Se déconnecter")}
              >
                {t("common", "logout", "Se déconnecter")}
              </button>
            ) : (
              <button
                type="button"
                className="lp-btn lp-btn-auth lp-btn-login"
                onClick={handleLogin}
                aria-label={t("auth", "login", "Connexion")}
              >
                {t("auth", "login", "Connexion")}
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ─── HERO ─── */}
        <section className="lp-hero">
          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-copy">
              <p className="lp-eyebrow">{t("landing", "eyebrow", "Orientation · IA · Parcours guidé")}</p>
              <h1 className="lp-title">{t("landing", "title", "Ton avenir commence ici.")}</h1>
              <p className="lp-lead">
                {t("landing", "lead", "Moov'Up aide les lycéens et étudiants à trouver leur voie...")}
              </p>
              <div className="lp-hero-badges">
                <span className="lp-mini-badge">{t("landing", "badge1", "✦ 10 questions")}</span>
                <span className="lp-mini-badge">{t("landing", "badge2", "✦ Résultat immédiat")}</span>
                <span className="lp-mini-badge">{t("landing", "badge3", "✦ Moov'Coach ensuite")}</span>
              </div>
              <div className="lp-hero-actions">
                <button type="button" className="lp-btn lp-btn-primary lp-btn-lg" onClick={goGuided}>
                  {t("landing", "ctaPrimary", "Lancer le parcours guidé")}
                </button>
                <a href={GOOGLE_DEMO_URL} target="_blank" rel="noopener noreferrer" className="lp-btn lp-btn-ghost lp-btn-lg">
                  {t("landing", "ctaSecondary", "Voir notre formulaire")}
                </a>
              </div>
              <ul className="lp-trust">
                <li>{t("landing", "trustItem1", "Gratuit et sans engagement")}</li>
                <li>{t("landing", "trustItem2", "Fiches officielles intégrées")}</li>
                <li>{t("landing", "trustItem3", "Recommandations personnalisées")}</li>
              </ul>
            </div>

            <div className="lp-hero-visual">
              <div className="lp-hero-img-wrap">
                <img
                  src="/moovup-hero.png"
                  alt={t("landing", "heroImgAlt", "Avec Moov'Up, ton avenir commence ici")}
                  className="lp-hero-img"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
                <div className="lp-hero-img-fallback" aria-hidden="true">
                  <span className="lp-hero-fallback-logo">M</span>
                  <p>Moov&apos;Up</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── CO-FONDATEURS ─── */}
        <section className="lp-section" id="fondateurs">
          <div className="lp-container">
            <div className="lp-section-head">
              <p className="lp-section-kicker">{t("landing", "foundersSection", "L'équipe fondatrice")}</p>
              <h2 className="lp-h2">{t("landing", "betaTitle", "Créé par des étudiants, pour les étudiants")}</h2>
              <p className="lp-sub" style={{ marginTop: "10px" }}>
                {t("landing", "foundersDesc", "Quatre co-fondateurs...")}
              </p>
            </div>
            <div className="lp-founder-grid">
              {FOUNDERS.map((founder) => (
                <article key={founder.name} className="lp-founder-card-v2">
                  <div className="lp-founder-avatar">{founder.initial}</div>
                  <p className="lp-founder-name">{founder.name}</p>
                  <p className="lp-founder-role">{t("landing", founder.roleKey, founder.roleFallback)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section lp-section-alt">
          <div className="lp-container">
            <div className="lp-section-head">
              <p className="lp-section-kicker">{t("landing", "whyKicker", "Pourquoi Moov'Up")}</p>
              <h2 className="lp-h2">{t("landing", "whyTitle", "Une orientation claire, concrète et sans blabla")}</h2>
              <p className="lp-sub" style={{ marginTop: "10px" }}>
                {t("landing", "whySub", "Moov'Up transforme l'incertitude en actions concrètes avec un parcours guidé, des fiches métiers réalistes et un coach IA disponible.")}
              </p>
            </div>
            <div className="lp-value-grid">
              <article className="lp-value-card">
                <h3 className="lp-h3">{t("landing", "whyMissionTitle", "Mission")}</h3>
                <p className="lp-feature-body">
                  {t("landing", "whyMissionBody", "Aider les 16-30 ans à choisir leur voie, trouver leur place dans l'emploi et avancer avec des informations fiables.")}
                </p>
              </article>
              <article className="lp-value-card">
                <h3 className="lp-h3">{t("landing", "whyVisionTitle", "Vision")}</h3>
                <p className="lp-feature-body">
                  {t("landing", "whyVisionBody", "Devenir le compagnon de vie pro que l'on ouvre chaque jour pour prendre de meilleures décisions de carrière.")}
                </p>
              </article>
              <article className="lp-value-card">
                <h3 className="lp-h3">{t("landing", "whyPromiseTitle", "Promesse")}</h3>
                <p className="lp-feature-body">
                  {t("landing", "whyPromiseBody", "Pas de jargon, pas de promesses floues : des étapes claires, des données concrètes, des actions immédiates.")}
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ─── STATS STRIP ─── */}
        <section className="lp-strip lp-stats-enhanced">
          <div className="lp-container">
            <div className="lp-stats-grid">
              <div className="lp-stat-card">
                <span className="lp-stat-icon">⚡</span>
                <div className="lp-stat-content">
                  <span className="lp-stat-value">{t("landing", "stat1Value", "< 2 min")}</span>
                  <span className="lp-stat-label">{t("landing", "stat1Label", "Pour un résultat")}</span>
                </div>
                <span className="lp-stat-badge">{t("landing", "stat1Badge", "Testé")}</span>
              </div>
              <div className="lp-stat-card">
                <span className="lp-stat-icon">🎯</span>
                <div className="lp-stat-content">
                  <span className="lp-stat-value">{t("landing", "stat2Value", "10 questions")}</span>
                  <span className="lp-stat-label">{t("landing", "stat2Label", "Bien pensées")}</span>
                </div>
                <span className="lp-stat-badge">{t("landing", "stat2Badge", "Smart")}</span>
              </div>
              <div className="lp-stat-card">
                <span className="lp-stat-icon">🔗</span>
                <div className="lp-stat-content">
                  <span className="lp-stat-value">{t("landing", "stat3Value", "50+")}</span>
                  <span className="lp-stat-label">{t("landing", "stat3Label", "Ressources officielles")}</span>
                </div>
                <span className="lp-stat-badge">{t("landing", "stat3Badge", "Fiables")}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── MISSION ─── */}
        <section className="lp-section lp-section-alt" id="produit">
          <div className="lp-container">
            <div className="lp-section-head">
              <p className="lp-section-kicker">{t("landing", "missionSection", "Notre mission")}</p>
              <h2 className="lp-h2">{t("landing", "missionTitle", "Moov'Up, c'est quoi ?")}</h2>
            </div>
            <div className="lp-about-v2">
              <div className="lp-about-v2-text">
                <p>
                  {t("landing", "missionIntro", "L'orientation scolaire...")}
                </p>
                <p>
                  {t("landing", "missionMain", "En quelques questions...")}
                </p>
                <p>
                  {t("landing", "missionCoach", "Et si tu veux aller plus loin ?...")}
                </p>
              </div>
              <div className="lp-about-v2-pillars">
                <div className="lp-pillar">
                  <span className="lp-pillar-icon">🎯</span>
                  <div>
                    <strong>{t("landing", "pillar1Title", "Compréhensible")}</strong>
                    <p>{t("landing", "pillar1Text", "Chaque recommandation est expliquée...")}</p>
                  </div>
                </div>
                <div className="lp-pillar">
                  <span className="lp-pillar-icon">⚡</span>
                  <div>
                    <strong>{t("landing", "pillar2Title", "Rapide")}</strong>
                    <p>{t("landing", "pillar2Text", "2 minutes pour un résultat immédiat...")}</p>
                  </div>
                </div>
                <div className="lp-pillar">
                  <span className="lp-pillar-icon">🔗</span>
                  <div>
                    <strong>{t("landing", "pillar3Title", "Officiel")}</strong>
                    <p>{t("landing", "pillar3Text", "Chaque étape renvoie vers des fiches...")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── COMMENT ÇA MARCHE ─── */}
        <section className="lp-section lp-section-alt" id="parcours">
          <div className="lp-container">
            <div className="lp-section-head">
              <p className="lp-section-kicker">{t("landing", "stepsSection", "Le processus")}</p>
              <h2 className="lp-h2">{t("landing", "stepsTitle", "Comment ça marche")}</h2>
              <p className="lp-sub" style={{ marginTop: "10px" }}>{t("landing", "stepsSub", "Trois étapes...")}</p>
            </div>
            <div className="lp-steps-v2">
              <article className="lp-step-v2">
                <span className="lp-step-num-v2">01</span>
                <div>
                  <h3 className="lp-h3">{t("landing", "step1Title", "Réponds au questionnaire")}</h3>
                  <p className="lp-feature-body">{t("landing", "step1Body", "10 questions courtes...")}</p>
                </div>
              </article>
              <article className="lp-step-v2">
                <span className="lp-step-num-v2">02</span>
                <div>
                  <h3 className="lp-h3">{t("landing", "step2Title", "Analyse de ton profil")}</h3>
                  <p className="lp-feature-body">{t("landing", "step2Body", "L'IA met en cohérence...")}</p>
                </div>
              </article>
              <article className="lp-step-v2">
                <span className="lp-step-num-v2">03</span>
                <div>
                  <h3 className="lp-h3">{t("landing", "step3Title", "Ton parcours personnalisé")}</h3>
                  <p className="lp-feature-body">{t("landing", "step3Body", "Tu vois les étapes...")}</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ─── VIDÉO ─── */}
        <section className="lp-section" id="video">
          <div className="lp-container">
            <div className="lp-section-head">
              <p className="lp-section-kicker">{t("landing", "videoSection", "En action")}</p>
              <h2 className="lp-h2">{t("landing", "videoTitle", "Voir Moov'Up en 60 secondes")}</h2>
            </div>
            <div className="lp-video-wrap">
              {VIDEO_EMBED_URL ? (
                <iframe
                  className="lp-video-iframe"
                  src={VIDEO_EMBED_URL}
                  title="Présentation Moov'Up"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="lp-video-placeholder">
                  <div className="lp-video-play-btn" onClick={goGuided} role="button" tabIndex={0} aria-label={t("a11y", "landingLaunch", "Lancer le parcours")}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <p className="lp-video-placeholder-text">{t("landing", "videoPlaceholder", "Vidéo de présentation")}</p>
                  <p className="lp-video-placeholder-sub">{t("landing", "videoComingSoon", "Bientôt disponible...")}</p>
                  <button type="button" className="lp-btn lp-btn-primary" onClick={goGuided} style={{ marginTop: "18px" }}>
                    {t("landing", "videoTryNow", "Essayer maintenant →")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ─── TÉMOIGNAGES ─── */}
        <section className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <p className="lp-section-kicker">{t("landing", "testimonialsSection", "Ils témoignent")}</p>
              <h2 className="lp-h2">{t("landing", "testimonialsTitle", "Ce qu'en disent les utilisateurs")}</h2>
            </div>
            <div className="lp-feature-grid">
              <article className="lp-feature lp-testimonial-card">
                <span className="lp-testimonial-emoji-v2">🎒</span>
                <p className="lp-feature-body" style={{ fontStyle: "italic", marginBottom: "14px" }}>
                  &ldquo;{t("landing", "testimonial1", "En 3 minutes j'ai eu un parcours clair...")}&rdquo;
                </p>
                <p className="lp-founder-role" style={{ margin: 0 }}>{t("landing", "testimonial1Name", "Léo, 17 ans")}</p>
              </article>
              <article className="lp-feature lp-testimonial-card">
                <span className="lp-testimonial-emoji-v2">⭐</span>
                <p className="lp-feature-body" style={{ fontStyle: "italic", marginBottom: "14px" }}>
                  &ldquo;{t("landing", "testimonial2", "Jamais eu une orientation aussi rapide...")}&rdquo;
                </p>
                <p className="lp-founder-role" style={{ margin: 0 }}>{t("landing", "testimonial2Name", "Sarah, 19 ans")}</p>
              </article>
              <article className="lp-feature lp-testimonial-card">
                <span className="lp-testimonial-emoji-v2">🚀</span>
                <p className="lp-feature-body" style={{ fontStyle: "italic", marginBottom: "14px" }}>
                  &ldquo;{t("landing", "testimonial3", "Je recommande à tous mes potes...")}&rdquo;
                </p>
                <p className="lp-founder-role" style={{ margin: 0 }}>{t("landing", "testimonial3Name", "Thomas, 21 ans")}</p>
              </article>
            </div>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="lp-section lp-section-alt" id="faq">
          <div className="lp-container">
            <div className="lp-section-head">
              <p className="lp-section-kicker lp-faq-kicker">{t("landing", "faqSection", "Questions fréquentes")}</p>
              <h2 className="lp-h2 lp-faq-title">{t("landing", "faqTitle", "Tu as des questions ?")}</h2>
            </div>
            <div className="lp-faq-v2">
              <article className="lp-faq-item-v2">
                <h3 className="lp-h3 lp-faq-question">{t("landing", "faq1Q", "Est-ce un conseil d'orientation officiel ?")}</h3>
                <p className="lp-feature-body">{t("landing", "faq1A", "Moov'Up est une aide à la réflexion et à la décision, conçue pour compléter un accompagnement humain.")}</p>
              </article>
              <article className="lp-faq-item-v2">
                <h3 className="lp-h3 lp-faq-question">{t("landing", "faq2Q", "Mes réponses sont-elles enregistrées ?")}</h3>
                <p className="lp-feature-body">{t("landing", "faq2A", "Avec un compte, tes réponses servent à ton profil et à Moov'Coach. Sans connexion, rien n'est enregistré par l'application.")}</p>
              </article>
              <article className="lp-faq-item-v2">
                <h3 className="lp-h3 lp-faq-question">{t("landing", "faq3Q", "C'est gratuit ?")}</h3>
                <p className="lp-feature-body">{t("landing", "faq3A", "Oui, entièrement gratuit et sans engagement. Tu peux relancer le parcours autant de fois que tu veux.")}</p>
              </article>
              <article className="lp-faq-item-v2">
                <h3 className="lp-h3 lp-faq-question">{t("landing", "faq4Q", "Combien de temps prend le questionnaire ?")}</h3>
                <p className="lp-feature-body">{t("landing", "faq4A", "Environ 3 minutes : 10 questions ciblées, sans création de compte, pour un résultat personnalisé immédiat.")}</p>
              </article>
              <article className="lp-faq-item-v2">
                <h3 className="lp-h3 lp-faq-question">{t("landing", "faq5Q", "À qui s'adresse Moov'Up ?")}</h3>
                <p className="lp-feature-body">{t("landing", "faq5A", "Aux 16-30 ans : lycéens qui hésitent après le bac, étudiants qui doutent de leur filière, jeunes actifs en quête de stabilité ou en reconversion.")}</p>
              </article>
              <article className="lp-faq-item-v2">
                <h3 className="lp-h3 lp-faq-question">{t("landing", "faq6Q", "Comment fonctionne le coach IA Moov'Coach ?")}</h3>
                <p className="lp-feature-body">{t("landing", "faq6A", "Disponible 24/7, il complète le questionnaire en répondant à tes questions précises sur les métiers, les études, les salaires et les débouchés.")}</p>
              </article>
            </div>
          </div>
        </section>

        {/* ─── CTA FINAL ─── */}
        <section className="lp-section">
          <div className="lp-container">
            <div className="lp-cta-banner">
              <div>
                <h2 className="lp-h2" style={{ margin: "0 0 10px" }}>
                  {t("landing", "ctaFinalTitle", "Prêt à trouver ta voie ?")}
                </h2>
                <p className="lp-sub" style={{ margin: 0 }}>
                  {t("landing", "ctaFinalSub", "Gratuit · Sans inscription · Résultat en 2 minutes")}
                </p>
              </div>
              <div className="lp-cta-actions">
                <button type="button" className="lp-btn lp-btn-primary lp-btn-lg" onClick={goGuided}>
                  {t("landing", "ctaFinalBtn", "Lancer le parcours →")}
                </button>
                <button type="button" className="lp-btn lp-btn-ghost lp-btn-lg" onClick={goTop}>
                  ↑ {t("landing", "navTop", "Haut")}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}
