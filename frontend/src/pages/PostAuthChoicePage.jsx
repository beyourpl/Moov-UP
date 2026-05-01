import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TopBarAccountTools } from "../components/TopBarAccountTools.jsx";
import { getLastConversationId } from "../data/conversationStorage.js";
import { logoutUser } from "../data/authStorage.js";
import { getText } from "../data/translations.js";
import { useUiPreferences } from "../hooks/useUiPreferences.js";

export default function PostAuthChoicePage() {
  const navigate = useNavigate();
  const { theme, language } = useUiPreferences();

  const t = (section, key, fallback) => getText(language, section, key, fallback);

  const ui = useMemo(
    () => ({
      questionnaire: t("choice", "questionnaire", "Faire le questionnaire"),
      assistant: t("choice", "assistant", "Parler à Moov'Coach"),
      title: t("choice", "title", "Que veux tu faire maintenant ?"),
      description: t(
        "choice",
        "description",
        "Choisis l'option qui te convient le mieux."
      ),
      welcome: t("choice", "welcome", "Bienvenue"),
      logout: t("common", "logout", "Se déconnecter"),
      questionnaireSub: t(
        "choice",
        "questionnaireSub",
        "Construire une orientation étape par étape."
      ),
      assistantSub: t(
        "choice",
        "assistantSub",
        "Poser tes questions directement au chatbot."
      ),
      cvlmTitle: t("choice", "cvlmTitle", "Analyser CV & LM"),
      cvlmSub: t("choice", "cvlmSub", "Upload et analyse IA de tes documents"),
      brandMissionTitle: t("choice", "brandMissionTitle", "Mission"),
      brandMissionText: t(
        "choice",
        "brandMissionText",
        "Accompagner les 16 à 30 ans dans l'orientation, l'insertion et la reconversion avec des informations claires, réalistes et actionnables."
      ),
      brandVisionTitle: t("choice", "brandVisionTitle", "Vision"),
      brandVisionText: t(
        "choice",
        "brandVisionText",
        "Devenir le compagnon de vie pro du quotidien pour chaque décision de carrière."
      ),
      brandValuesTitle: t("choice", "brandValuesTitle", "Valeurs"),
      brandValuesText: t(
        "choice",
        "brandValuesText",
        "Proximité, transparence, efficacité et empowerment."
      ),
      brandAudienceTitle: t("choice", "brandAudienceTitle", "Audience"),
      brandAudienceText: t(
        "choice",
        "brandAudienceText",
        "Jeunes de 16 à 30 ans en orientation, insertion ou reconversion."
      ),
      brandPositioningTitle: t("choice", "brandPositioningTitle", "Positionnement"),
      brandPositioningText: t(
        "choice",
        "brandPositioningText",
        "Moov'Up relie orientation, emploi et accompagnement dans une expérience simple."
      ),
    }),
    [language]
  );

  const handleLogout = () => {
    logoutUser();
    navigate("/auth", { replace: true });
  };

  const assistantHref = (() => {
    const id = getLastConversationId();
    return id ? `/assistant?cid=${id}` : "/assistant";
  })();

  return (
    <div className={`app quiz-app ${theme} post-auth-choice`}>
      <div className="top-actions quiz-top">
        <Link to="/" className="quiz-site-link">
          ← Moov&apos;Up
        </Link>

        <div className="quiz-top-btns">
          <TopBarAccountTools className="quiz-top-tools" />

          <button
            type="button"
            className="nav-btn secondary"
            onClick={handleLogout}
            aria-label={ui.logout}
          >
            {ui.logout}
          </button>
        </div>
      </div>

      <section className="hero post-auth-choice-hero">
        <span className="eyebrow">{ui.welcome}</span>
        <h1>{ui.title}</h1>
        <p className="post-auth-choice-lead">{ui.description}</p>
      </section>

      <section className="panel post-auth-choice-cards">
        <div className="choices post-auth-choice-grid">
          <Link to="/demo" className="answer-btn choice-link">
            <span className="answer-title">{ui.questionnaire}</span>
            <span className="answer-sub">{ui.questionnaireSub}</span>
          </Link>

          <Link to={assistantHref} className="answer-btn choice-link">
            <span className="answer-title">{ui.assistant}</span>
            <span className="answer-sub">{ui.assistantSub}</span>
          </Link>

          <Link to="/cvlm" className="answer-btn choice-link">
            <span className="answer-title">{ui.cvlmTitle}</span>
            <span className="answer-sub">{ui.cvlmSub}</span>
          </Link>
        </div>
      </section>

      <section className="panel brand-identity-panel">
        <h2 className="brand-identity-title">{t("common", "brandIdentityTitle", "Identité de marque")}</h2>
        <div className="brand-identity-grid">
          <article className="brand-identity-item">
            <h3>{ui.brandMissionTitle}</h3>
            <p>{ui.brandMissionText}</p>
          </article>
          <article className="brand-identity-item">
            <h3>{ui.brandVisionTitle}</h3>
            <p>{ui.brandVisionText}</p>
          </article>
          <article className="brand-identity-item">
            <h3>{ui.brandValuesTitle}</h3>
            <p>{ui.brandValuesText}</p>
          </article>
          <article className="brand-identity-item">
            <h3>{ui.brandAudienceTitle}</h3>
            <p>{ui.brandAudienceText}</p>
          </article>
          <article className="brand-identity-item brand-identity-item-wide">
            <h3>{ui.brandPositioningTitle}</h3>
            <p>{ui.brandPositioningText}</p>
          </article>
        </div>
      </section>
    </div>
  );
}
