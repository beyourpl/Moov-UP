import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TopBarAccountTools } from "../components/TopBarAccountTools.jsx";
import { getSession, loginUser, logoutUser, registerUser } from "../data/authStorage.js";
import { useTranslation } from "../hooks/useTranslation.js";

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const [session, setSession] = useState(() => getSession());

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailValid = useMemo(() => validateEmail(email), [email]);
  const isRegister = mode === "register";

  const ui = useMemo(
    () => ({
      logout: t("common", "logout", "Se déconnecter"),
      home: t("common", "home", "Accueil"),
      eyebrow: t("auth", "eyebrow", "Compte utilisateur"),
      heroLogin: t("auth", "heroLogin", "Connexion"),
      heroRegister: t("auth", "heroRegister", "Créer ton compte"),
      leadLogin: t(
        "auth",
        "leadLogin",
        "Connecte-toi pour enregistrer ton parcours, refaire le quiz et discuter avec Moov'Coach."
      ),
      leadRegister: t(
        "auth",
        "leadRegister",
        "Un email, un mot de passe sécurisé : accède au questionnaire et au coach personnalisé."
      ),
      loginTab: t("auth", "login", "Connexion"),
      registerTab: t("auth", "register", "Créer un compte"),
      email: t("auth", "email", "Adresse email"),
      password: t("auth", "password", "Mot de passe"),
      submitLogin: t("auth", "submitLogin", "Se connecter"),
      submitRegister: t("auth", "submitRegister", "Créer mon compte"),
      brandSub: t("auth", "brandSub", "Une orientation claire, concrète et sans jargon."),
      brandIdentity: t("common", "brandIdentityTitle", "Identité de marque"),
      brandMissionTitle: t("common", "brandMissionTitle", "Mission"),
      brandMissionText: t(
        "common",
        "brandMissionText",
        "Accompagner les 16-30 ans dans leur orientation, insertion et reconversion avec des informations claires et actionnables."
      ),
      brandVisionTitle: t("common", "brandVisionTitle", "Vision"),
      brandVisionText: t(
        "common",
        "brandVisionText",
        "Devenir le compagnon de vie pro que l'on ouvre chaque jour pour prendre de meilleures décisions."
      ),
      brandValuesTitle: t("common", "brandValuesTitle", "Valeurs"),
      brandValuesText: t(
        "common",
        "brandValuesText",
        "Proximité, transparence, efficacité et empowerment."
      ),
      trust1: t("auth", "trust1", "Compte sécurisé"),
      trust2: t("auth", "trust2", "Données & fiches ONISEP"),
      trust3: t("auth", "trust3", "Moov'Coach inclus"),
      toggleShow: t("auth", "toggleShow", "Afficher"),
      toggleHide: t("auth", "toggleHide", "Masquer"),
      switchToLogin: t("auth", "switchToLogin", "Se connecter"),
      switchToRegister: t("auth", "switchToRegister", "Créer un compte"),
      alreadyAccount: t("auth", "alreadyAccount", "Déjà un compte ?"),
      noAccount: t("auth", "noAccount", "Pas encore inscrit ?"),
      emailInvalid: t("auth", "errorInvalidEmail", "Adresse email invalide."),
      hintRegister: t(
        "auth",
        "hintRegister",
        "Ton mot de passe doit respecter les critères ci-dessous pour protéger ton compte."
      ),
      emailPlaceholder: t("auth", "emailPlaceholder", "ex. prenom@example.com"),
      pwdRuleLen: t("auth", "pwdRuleLen", "Au moins 10 caractères"),
      pwdRuleDigit: t("auth", "pwdRuleDigit", "Au moins 1 chiffre"),
      pwdRuleSymbol: t("auth", "pwdRuleSymbol", "Au moins 1 symbole (!@#$…)"),
    }),
    [t, language]
  );

  const pwdChecks = useMemo(() => {
    const rules = [
      { id: "len", label: ui.pwdRuleLen, test: (p) => p.length >= 10 },
      { id: "digit", label: ui.pwdRuleDigit, test: (p) => /\d/.test(p) },
      { id: "symbol", label: ui.pwdRuleSymbol, test: (p) => /[^a-zA-Z0-9\s]/.test(p) },
    ];
    return rules.map((r) => ({ ...r, ok: r.test(password) }));
  }, [password, ui.pwdRuleLen, ui.pwdRuleDigit, ui.pwdRuleSymbol]);

  const pwdValid = pwdChecks.every((c) => c.ok);
  const formValid = emailValid && (isRegister ? pwdValid : password.length > 0);

  const switchMode = (next) => {
    setMode(next);
    setServerError("");
    setSubmitted(false);
  };

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
      if (isRegister) await registerUser(email, password);
      else await loginUser(email, password);
      setSession(getSession());
      navigate("/choice");
    } catch (err) {
      setServerError(
        err.message || t("auth", "errorServer", "Une erreur est survenue, réessaie.")
      );
    } finally {
      setLoading(false);
    }
  };

  const emailError = submitted && !emailValid ? ui.emailInvalid : "";

  return (
    <div className="lp fade-in">
      <header className="lp-header">
        <div className="lp-header-inner">
          <Link to="/" className="lp-logo">Moov&apos;Up</Link>
          <nav className="lp-nav" aria-label={t("a11y", "mainNav", "Navigation principale")}>
            <Link to="/">{ui.home}</Link>
          </nav>
          <div className="lp-header-cta">
            <TopBarAccountTools withAccountPill={Boolean(session)} className="lp-header-tools" />
            {session ? (
              <button
                type="button"
                className="lp-btn lp-btn-auth lp-btn-logout"
                onClick={handleLogout}
                aria-label={ui.logout}
              >
                {ui.logout}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="auth-main">
        <section className="auth-hero-band">
          <div className="lp-container">
            <p className="lp-eyebrow auth-eyebrow">{ui.eyebrow}</p>
            <h1 className="lp-title auth-hero-title">
              {isRegister ? ui.heroRegister : ui.heroLogin}
            </h1>
            <p className="lp-lead auth-hero-lead">
              {isRegister ? ui.leadRegister : ui.leadLogin}
            </p>
          </div>
        </section>

        <section className="lp-section auth-split-section">
          <div className="lp-container auth-split">
            <aside className="auth-brand-panel">
              <div className="auth-brand-header">
                <span className="auth-brand-badge">Moov&apos;Up</span>
                <h2 className="auth-brand-title">{ui.brandIdentity}</h2>
                <p className="auth-brand-sub">{ui.brandSub}</p>
              </div>

              <ul className="auth-brand-list">
                <li className="auth-brand-card">
                  <span className="auth-brand-icon" aria-hidden="true">🎯</span>
                  <div>
                    <h3>{ui.brandMissionTitle}</h3>
                    <p>{ui.brandMissionText}</p>
                  </div>
                </li>
                <li className="auth-brand-card">
                  <span className="auth-brand-icon" aria-hidden="true">🚀</span>
                  <div>
                    <h3>{ui.brandVisionTitle}</h3>
                    <p>{ui.brandVisionText}</p>
                  </div>
                </li>
                <li className="auth-brand-card">
                  <span className="auth-brand-icon" aria-hidden="true">💎</span>
                  <div>
                    <h3>{ui.brandValuesTitle}</h3>
                    <p>{ui.brandValuesText}</p>
                  </div>
                </li>
              </ul>

              <div className="auth-brand-foot">
                <span className="auth-brand-pill">✓ {ui.trust1}</span>
                <span className="auth-brand-pill">✓ {ui.trust2}</span>
                <span className="auth-brand-pill">✓ {ui.trust3}</span>
              </div>
            </aside>

            <div className="auth-card">
              <div className="auth-card-glow" aria-hidden="true" />
              <div className="auth-card-inner">
                <div className="auth-tabs" role="tablist" aria-label={t("a11y", "authMode", "Mode de connexion")}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!isRegister}
                    className={`auth-tab${!isRegister ? " active" : ""}`}
                    onClick={() => switchMode("login")}
                  >
                    {ui.loginTab}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isRegister}
                    className={`auth-tab${isRegister ? " active" : ""}`}
                    onClick={() => switchMode("register")}
                  >
                    {ui.registerTab}
                  </button>
                </div>

                <form className="auth-form" onSubmit={submit} noValidate>
                  <label className="auth-field">
                    <span className="auth-field-label">{ui.email}</span>
                    <input
                      id="auth-email"
                      type="email"
                      name="email"
                      placeholder={ui.emailPlaceholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className={emailError ? "auth-input-error" : ""}
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={emailError ? "auth-email-err" : undefined}
                    />
                    {emailError ? (
                      <p id="auth-email-err" className="auth-field-error" role="alert">
                        {emailError}
                      </p>
                    ) : null}
                  </label>

                  <div className="auth-field">
                    <span className="auth-field-label">{ui.password}</span>
                    <div className="auth-password-row">
                      <input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={isRegister ? "new-password" : "current-password"}
                      />
                      <button
                        type="button"
                        className="auth-password-toggle"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? ui.toggleHide : ui.toggleShow}
                      >
                        {showPassword ? ui.toggleHide : ui.toggleShow}
                      </button>
                    </div>
                    {isRegister ? (
                      <>
                        <ul className="auth-password-rules" aria-live="polite">
                          {pwdChecks.map((c) => (
                            <li key={c.id} className={c.ok ? "ok" : ""}>
                              <span className="rule-icon" aria-hidden="true">{c.ok ? "✓" : "○"}</span>
                              {c.label}
                            </li>
                          ))}
                        </ul>
                        <p className="auth-inline-hint">{ui.hintRegister}</p>
                      </>
                    ) : null}
                  </div>

                  {serverError ? (
                    <p className="auth-error" role="alert">{serverError}</p>
                  ) : null}

                  <button
                    type="submit"
                    className="auth-submit"
                    disabled={loading || (submitted && !formValid)}
                  >
                    <span>{loading ? "…" : isRegister ? ui.submitRegister : ui.submitLogin}</span>
                    <span className="auth-submit-arrow" aria-hidden="true">→</span>
                  </button>
                </form>

                <p className="auth-switch-row">
                  {isRegister ? (
                    <>
                      {ui.alreadyAccount}{" "}
                      <button type="button" className="auth-link" onClick={() => switchMode("login")}>
                        {ui.switchToLogin}
                      </button>
                    </>
                  ) : (
                    <>
                      {ui.noAccount}{" "}
                      <button type="button" className="auth-link" onClick={() => switchMode("register")}>
                        {ui.switchToRegister}
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
