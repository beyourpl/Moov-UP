import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PartenairesAudienceSwitch from "../components/PartenairesAudienceSwitch.jsx";
import PartenairesPricingCards from "../components/partenaires/PartenairesPricingCards.jsx";
import { TopBarAccountTools } from "../components/TopBarAccountTools.jsx";
import { completeLogin2FA, getSession, loginUser, logoutUser } from "../data/authStorage.js";
import { buildPartenairesAuthOffersSectionUi, buildPartenairesOfferUi } from "../data/partenairesOfferUi.js";
import { getPartenairesOffer, getPostAuthLandingPath, setPartenairesOffer } from "../data/partenairesSession.js";
import { useTranslation } from "../hooks/useTranslation.js";
import { useNavigateBack } from "../hooks/useNavigateBack.js";

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function PartenairesAuthPage() {
  const navigate = useNavigate();
  const goBackPage = useNavigateBack("/partenaires");
  const { t, language } = useTranslation();
  const [session, setSession] = useState(() => getSession());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [twoFaTempToken, setTwoFaTempToken] = useState(null);
  const [twoFaCode, setTwoFaCode] = useState("");

  const emailValid = useMemo(() => validateEmail(email), [email]);
  const formValid = emailValid && password.length > 0;

  const ui = useMemo(
    () => ({
      home: t("common", "home", "Accueil"),
      logout: t("common", "logout", "Se déconnecter"),
      eyebrow: t("partenaires", "authEyebrow", "Connexion structure"),
      title: t("partenaires", "authTitle", "Accès partenaires"),
      lead: t(
        "partenaires",
        "authLead",
        "Utilise le compte de ta mission locale, ton lycée ou ton réseau. Après connexion, tu choisis l’offre adaptée (Freemium, Premium ou Licences B2B)."
      ),
      email: t("auth", "email", "Adresse email"),
      password: t("auth", "password", "Mot de passe"),
      submit: t("partenaires", "authSubmit", "Se connecter"),
      emailInvalid: t("auth", "errorInvalidEmail", "Adresse email invalide."),
      toggleShow: t("auth", "toggleShow", "Afficher"),
      toggleHide: t("auth", "toggleHide", "Masquer"),
      forgotPublic: t("partenaires", "authJeunesLink", "Compte jeune ? Connexion classique"),
      twoFaTitle: t("auth", "twoFaTitle", "Code de double authentification"),
      twoFaLead: t(
        "auth",
        "twoFaLead",
        "Ouvre ton appli (Google Authenticator, Microsoft Authenticator, etc.) et saisis le code à 6 chiffres."
      ),
      twoFaCode: t("auth", "twoFaCode", "Code à 6 chiffres"),
      twoFaSubmit: t("auth", "twoFaSubmit", "Valider et continuer"),
      twoFaBack: t("auth", "twoFaBack", "Modifier email ou mot de passe"),
      connectedLead: t(
        "partenaires",
        "authConnectedLead",
        "Vous êtes connecté·e. Accédez à l’espace Moov’Up partenaires ou ouvrez directement votre tableau de bord."
      ),
      connectedIntro: t("partenaires", "authConnectedIntro", "Espace missions locales & partenaires"),
      connectedOffers: t("partenaires", "authConnectedOffers", "Voir les offres"),
      connectedDashboard: t("partenaires", "goDashboard", "Ouvrir le tableau de bord"),
    }),
    [t, language]
  );

  const offerUi = useMemo(() => buildPartenairesOfferUi(t), [t, language]);
  const authOffersIntro = useMemo(() => buildPartenairesAuthOffersSectionUi(t), [t, language]);

  const handleLogout = () => {
    logoutUser();
    setSession(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError("");
    if (!formValid) return;
    setLoading(true);
    try {
      const result = await loginUser(email, password);
      if (result.needs2fa) {
        setTwoFaTempToken(result.tempToken);
        setLoading(false);
        return;
      }
      setSession(getSession());
      navigate(getPostAuthLandingPath(), { replace: true });
    } catch (err) {
      setServerError(err.message || t("auth", "errorServer", "Une erreur est survenue, réessaie."));
    } finally {
      setLoading(false);
    }
  };

  const submitTwoFa = async (e) => {
    e.preventDefault();
    setServerError("");
    const clean = twoFaCode.replace(/\s/g, "");
    if (!/^\d{6,8}$/.test(clean)) {
      setServerError(t("auth", "twoFaInvalid", "Code incorrect."));
      return;
    }
    setLoading(true);
    try {
      await completeLogin2FA(twoFaTempToken, clean);
      setTwoFaTempToken(null);
      setTwoFaCode("");
      setSession(getSession());
      navigate(getPostAuthLandingPath(), { replace: true });
    } catch (err) {
      setServerError(err.message || t("auth", "twoFaInvalid", "Code incorrect."));
    } finally {
      setLoading(false);
    }
  };

  const emailError = submitted && !emailValid ? ui.emailInvalid : "";
  const currentOffer = getPartenairesOffer()?.offer;
  const showConnectedPanel = Boolean(session) && !twoFaTempToken;

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
          </nav>
          <div className="lp-header-cta">
            <TopBarAccountTools className="lp-header-tools" />
            {session ? (
              <button type="button" className="lp-btn lp-btn-ghost" onClick={handleLogout}>
                {ui.logout}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="lp-container partenaires-auth-main partenaires-auth-main--with-offers">
        <div className="partenaires-auth-panel-wrap">
          <div className="partenaires-auth-panel">
            <header className="partenaires-auth-intro">
              <p className="lp-eyebrow">{ui.eyebrow}</p>
              <h1 className="lp-title">{twoFaTempToken ? ui.twoFaTitle : ui.title}</h1>
              <p className="lp-lead">{twoFaTempToken ? ui.twoFaLead : ui.lead}</p>
            </header>

            {twoFaTempToken ? (
              <form className="partenaires-auth-form" onSubmit={submitTwoFa}>
                <label className="auth-field-label">
                  <span>{ui.twoFaCode}</span>
                  <input
                    className="auth-input"
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value)}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                  />
                </label>
                {serverError ? <p className="auth-error">{serverError}</p> : null}
                <div className="partenaires-form-actions">
                  <button type="submit" className="lp-btn lp-btn-primary" disabled={loading}>
                    {ui.twoFaSubmit}
                  </button>
                  <button
                    type="button"
                    className="lp-btn lp-btn-ghost"
                    onClick={() => {
                      setTwoFaTempToken(null);
                      setTwoFaCode("");
                      setServerError("");
                    }}
                  >
                    {ui.twoFaBack}
                  </button>
                </div>
              </form>
            ) : showConnectedPanel ? (
              <div className="partenaires-auth-connected">
                <p className="lp-lead partenaires-auth-connected-lead">{ui.connectedLead}</p>
                <div className="partenaires-form-actions partenaires-auth-connected-actions">
                  <Link to="/partenaires" className="lp-btn lp-btn-primary lp-btn-lg">
                    {ui.connectedIntro}
                  </Link>
                  {currentOffer === "licences_b2b" ? (
                    <Link to="/partenaires/tableau-de-bord" className="lp-btn lp-btn-secondary lp-btn-lg">
                      {ui.connectedDashboard}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="lp-btn lp-btn-secondary lp-btn-lg"
                      onClick={() => {
                        setPartenairesOffer("licences_b2b");
                        navigate("/partenaires/tableau-de-bord", { replace: true });
                      }}
                    >
                      {ui.connectedDashboard}
                    </button>
                  )}
                  <Link to="/partenaires/offres" className="lp-btn lp-btn-ghost lp-btn-lg">
                    {ui.connectedOffers}
                  </Link>
                </div>
              </div>
            ) : (
              <form className="partenaires-auth-form" onSubmit={submit}>
                <label className="auth-field-label">
                  <span>{ui.email}</span>
                  <input
                    className="auth-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                  />
                </label>
                {emailError ? <p className="auth-error">{emailError}</p> : null}
                <label className="auth-field-label">
                  <span>{ui.password}</span>
                  <div className="auth-password-row partenaires-auth-password-row">
                    <input
                      className="auth-input"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="partenaires-auth-toggle-pwd"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? ui.toggleHide : ui.toggleShow}
                    </button>
                  </div>
                </label>
                {serverError ? <p className="auth-error">{serverError}</p> : null}
                <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg" disabled={loading}>
                  {loading ? "…" : ui.submit}
                </button>
              </form>
            )}

            <p className="partenaires-auth-footer">
              <Link to="/auth">{ui.forgotPublic}</Link>
            </p>
          </div>
        </div>

        {!twoFaTempToken ? (
          <section className="partenaires-auth-offers" aria-labelledby="partenaires-auth-offers-heading">
            <header className="partenaires-auth-offers-head">
              <p className="lp-eyebrow partenaires-auth-offers-eyebrow">{authOffersIntro.eyebrow}</p>
              <h2 id="partenaires-auth-offers-heading" className="partenaires-auth-offers-title">
                {authOffersIntro.title}
              </h2>
              <p className="partenaires-auth-offers-lead">{authOffersIntro.lead}</p>
            </header>

            <div className="partenaires-pricing-grid partenaires-pricing-grid--auth-preview partenaires-pricing-grid--deck">
              <PartenairesPricingCards ui={offerUi} variant="preview" />
            </div>

            <p className="partenaires-auth-offers-foot">
              <span className="partenaires-auth-offers-foot-text">{authOffersIntro.foot}</span>{" "}
              <Link to="/partenaires" className="partenaires-auth-offers-foot-link">
                {authOffersIntro.footLink}
              </Link>
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
