import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiPost } from "../data/apiClient.js";
import { getSession, logoutUser } from "../data/authStorage.js";
import { clearQuizDraft, loadQuizDraft, saveQuizDraft } from "../data/quizDraftStorage.js";
import { setLastConversationId } from "../data/conversationStorage.js";
import { getQuizChoiceText, getQuizQuestionText, getText } from "../data/translations.js";
import { playQuizTickSound } from "../data/quizTickSound.js";
import { setQuizTickSoundEnabled } from "../data/uiPreferences.js";
import { useUiPreferences } from "../hooks/useUiPreferences.js";
import {
  QUESTION_ORDER,
  specialtyConfig,
} from "../data/orientationHelpers.js";

/** Pause après chaque choix avant la question suivante (ou avant l’analyse finale), en ms. */
const QUIZ_ADVANCE_DELAY_MS = 500;

const Q1_CHOICES = [
  { value: "tech", title: "Tech", sub: "Informatique, code, données, cybersécurité" },
  { value: "business", title: "Business", sub: "Commerce, gestion, finance, marketing" },
  { value: "creative", title: "Créatif", sub: "Design, graphisme, audiovisuel, communication" },
  { value: "sante", title: "Santé", sub: "Médical, paramédical, bien-être" },
  { value: "education", title: "Éducation", sub: "Enseignement, formation" },
  { value: "droit", title: "Droit", sub: "Juridique, avocat, notariat" },
  { value: "industrie", title: "Industrie", sub: "Production, ingénierie, maintenance" },
  { value: "batiment", title: "Bâtiment", sub: "Construction, architecture, BTP" },
  { value: "agriculture", title: "Agriculture", sub: "Agro, environnement, nature" },
  { value: "service", title: "Services", sub: "Tourisme, sport, événementiel" },
];

const Q2_CHOICES = [
  { value: "pratique", title: "Pratique", sub: "J'aime manipuler, tester, construire" },
  { value: "equilibre", title: "Équilibré", sub: "J'aime autant la pratique que la théorie" },
  { value: "theorie", title: "Théorique", sub: "J'aime comprendre avant d'appliquer" },
];

const Q3_CHOICES = [
  { value: "college", title: "Collège", sub: "Je suis au collège (3e ou moins)" },
  { value: "seconde", title: "Seconde", sub: "Je suis en seconde ou première" },
  { value: "terminale", title: "Terminale", sub: "Je prépare le bac cette année" },
  { value: "bac", title: "Bac", sub: "J'ai déjà le bac" },
  { value: "bac2", title: "Bac+2", sub: "BTS, DUT, niveau licence" },
  { value: "bac3", title: "Bac+3", sub: "Licence, bachelor" },
  { value: "bac5", title: "Bac+5", sub: "Master, école d'ingénieurs, MBA" },
];

const Q4_CHOICES = [
  { value: "bureau", title: "Bureau", sub: "Cadre structuré, travail en équipe" },
  { value: "terrain", title: "Terrain", sub: "Plus de concret, de mouvement" },
  { value: "itinerant", title: "Itinérant", sub: "Déplacement fréquent, sur plusieurs sites" },
  { value: "distanciel", title: "À distance", sub: "Travail ou formation en ligne" },
];

const Q5_CHOICES = [
  { value: "bureau", title: "Bureau", sub: "En entreprise, dans un cadre structuré" },
  { value: "laboratoire", title: "Laboratoire", sub: "En recherche ou expérimentation" },
  { value: "terrain", title: "Terrain", sub: "Sur le terrain, au contact direct" },
  { value: "itinerant", title: "Itinérant", sub: "En déplacement, sur plusieurs lieux" },
  { value: "distanciel", title: "À distance", sub: "En télétravail ou en ligne" },
];

const Q6_CHOICES = [
  { value: "encadre", title: "Encadré", sub: "J'ai besoin d'un cadre clair et régulier" },
  { value: "mixte", title: "Mixte", sub: "Un mélange de guidance et d'autonomie" },
  { value: "autonome", title: "Autonome", sub: "J'aime apprendre seul et décider" },
];

const Q7_CHOICES = [
  { value: "encadre", title: "Encadré", sub: "J'ai besoin d'un cadre clair et régulier" },
  { value: "mixte", title: "Mixte", sub: "Un mélange de guidance et d'autonomie" },
  { value: "autonome", title: "Autonome", sub: "J'aime apprendre seul et décider" },
];

const Q8_CHOICES = [
  { value: "fort", title: "À l'aise", sub: "J'aime les chiffres et la logique" },
  { value: "moyen", title: "Correct", sub: "Je me débrouille sans en faire ma priorité" },
  { value: "faible", title: "Pas mon point fort", sub: "Je préfère d'autres approches" },
];

const Q9_CHOICES = [
  { value: "insertion", title: "Trouver un job", sub: "Entrer rapidement dans la vie active" },
  { value: "expertise", title: "Expertise", sub: "Devenir spécialiste dans un domaine" },
  { value: "flexibilite", title: "Flexibilité", sub: "Garder plusieurs options ouvertes" },
  { value: "creation", title: "Créer mon activité", sub: "Entrepreneuriat, freelance" },
];

const Q10_CHOICES = [
  { value: "local", title: "Près de chez moi", sub: "Je reste dans ma région" },
  { value: "mobile", title: "Mobile", sub: "Je peux bouger en France" },
  { value: "international", title: "International", sub: "Je peux partir à l'étranger" },
  { value: "distanciel", title: "À distance", sub: "Je préfère les formations en ligne" },
];

const BASE_QUESTIONS = [
  { id: "q1", title: "Dans quel univers professionnel te projettes-tu le plus ?", body: "Choisis le type d'activités qui te motive le plus au quotidien.", choices: Q1_CHOICES },
  { id: "q2", title: "Quel mode d'apprentissage te fait vraiment progresser ?", body: "Cette information aide à recommander des formations adaptées à ton style d'études.", choices: Q2_CHOICES },
  { id: "q3", title: "Où en es-tu aujourd'hui dans ton parcours ?", body: "Je m'appuie sur ton niveau actuel pour te proposer une trajectoire réaliste.", choices: Q3_CHOICES },
  { id: "q4", title: "Quelle spécialité de ce domaine t'attire le plus ?", body: "Cette précision permet de cibler un métier et les études qui y mènent.", choices: Q4_CHOICES },
  { id: "q5", title: "Dans quel cadre tu te vois le mieux ?", body: "Cela affine le type de contexte professionnel qui te correspond.", choices: Q5_CHOICES },
  { id: "q6", title: "Quel rythme d'études te correspond ?", body: "Court, progressif, long ou en alternance : tu choisis ton tempo.", choices: Q6_CHOICES },
  { id: "q7", title: "Quel niveau d'encadrement te convient ?", body: "Cette information aide à orienter vers des parcours plus ou moins autonomes.", choices: Q7_CHOICES },
  { id: "q8", title: "Ton rapport aux chiffres et à la logique ?", body: "On mesure l'aisance quantitative pour renforcer la cohérence de l'orientation.", choices: Q8_CHOICES },
  { id: "q9", title: "Quel est ton objectif professionnel ?", body: "Cela aide à cibler les formations et les métiers les plus adaptés à tes ambitions.", choices: Q9_CHOICES },
  { id: "q10", title: "Quelle mobilité es-tu prêt(e) à avoir ?", body: "La disponibilité géographique aide à mieux filtrer les options réalistes.", choices: Q10_CHOICES },
];

function normalizeAnswer(value) {
  return value ? value.split("__")[0] : value;
}

function scrollToEl(element) {
  element?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function readInitialQuizFromDraft() {
  const d = loadQuizDraft();
  if (d?.phase === "quiz" && d.answers && typeof d.answers === "object" && typeof d.stepIndex === "number") {
    return {
      answers: d.answers,
      stepIndex: Math.min(Math.max(0, d.stepIndex), QUESTION_ORDER.length - 1),
      phase: "quiz",
      hadDraft: Object.keys(d.answers).length > 0,
    };
  }
  return { answers: {}, stepIndex: 0, phase: "quiz", hadDraft: false };
}

function ChoiceButton({ title, sub, active, disabled, onClick }) {
  return (
    <button
      type="button"
      className={`answer-btn${active ? " active" : ""}${disabled ? " is-waiting" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="answer-title">{title}</span>
      <span className="answer-sub">{sub}</span>
    </button>
  );
}

export default function QuizPage() {
  const navigate = useNavigate();
  const session = getSession();
  const { language, quizTickSound } = useUiPreferences();
  const initialQuiz = readInitialQuizFromDraft();
  const [answers, setAnswers] = useState(() => initialQuiz.answers);
  const [stepIndex, setStepIndex] = useState(() => initialQuiz.stepIndex);
  const [phase, setPhase] = useState(() => initialQuiz.phase);
  const [resumeBanner, setResumeBanner] = useState(() => initialQuiz.hadDraft);
  const [apiError, setApiError] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [checkPulse, setCheckPulse] = useState(false);
  const advancingSyncRef = useRef(false);
  const advanceTimerRef = useRef(null);
  const animatedProgressRef = useRef(0);
  const previousAnsweredCountRef = useRef(Object.keys(initialQuiz.answers || {}).length);
  const quizAnchor = useRef(null);
  const loaderAnchor = useRef(null);

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      clearAdvanceTimer();
      advancingSyncRef.current = false;
    },
    [clearAdvanceTimer],
  );
  const domain = normalizeAnswer(answers.q1);

  const currentQuestionId = QUESTION_ORDER[stepIndex];
  const currentQuestion = BASE_QUESTIONS.find((q) => q.id === currentQuestionId);
  const translatedQuestion = getQuizQuestionText(language, currentQuestionId);
  const translatedChoices = currentQuestion?.choices?.map((choice) => {
    const translatedChoice = getQuizChoiceText(language, currentQuestionId, choice.value, choice);
    return {
      ...choice,
      title: translatedChoice.title || choice.title,
      sub: translatedChoice.sub || choice.sub,
    };
  }) || [];
  const currentAnswer = answers[currentQuestionId];
  const answeredCount = Object.keys(answers).length;
  const isLastQuestion = stepIndex === QUESTION_ORDER.length - 1;
  const progressPercent = Math.round((stepIndex / QUESTION_ORDER.length) * 100);
  const stepLabelTpl = getText(language, "quizMeta", "step", `Question ${stepIndex + 1} sur ${QUESTION_ORDER.length}`);
  const progressText =
    stepIndex < QUESTION_ORDER.length
      ? stepLabelTpl.replace(/\{n\}/g, String(stepIndex + 1))
      : getText(language, "quizMeta", "pathGenerated", "Parcours généré");
  const canBack = stepIndex > 0 || phase === "loading" || phase === "error";
  const canGoPrev = phase === "quiz" && stepIndex > 0;
  const canGoNext = phase === "quiz" && Boolean(currentAnswer) && !advancing;

  useEffect(() => {
    const previous = previousAnsweredCountRef.current;
    previousAnsweredCountRef.current = answeredCount;
    if (answeredCount <= previous) return undefined;
    if (quizTickSound) playQuizTickSound();
    setCheckPulse(true);
    const timerId = window.setTimeout(() => setCheckPulse(false), 680);
    return () => window.clearTimeout(timerId);
  }, [answeredCount, quizTickSound]);

  useEffect(() => {
    const from = animatedProgressRef.current;
    const to = progressPercent;
    if (from === to) return undefined;

    let rafId = 0;
    const duration = 420;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - ((1 - t) ** 3);
      const next = Math.round(from + (to - from) * eased);
      animatedProgressRef.current = next;
      setAnimatedProgress(next);
      if (t < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [progressPercent]);
  const currentChoice = (() => {
    if (!currentAnswer) return null;
    if (currentQuestionId === "q4") {
      return specialtyConfig[domain]?.find((item) => item.value === currentAnswer) || null;
    }
    return translatedChoices.find((choice) => choice.value === currentAnswer) || currentQuestion?.choices?.find((choice) => choice.value === currentAnswer) || null;
  })();

  const ui = {
    back: getText(language, "quiz", "back", "Retour"),
    home: getText(language, "quiz", "home", "Accueil"),
    logout: getText(language, "quiz", "logout", "Se déconnecter"),
    title: getText(language, "quiz", "title", "Moov'Up"),
    intro: getText(language, "quiz", "intro", "Réponds à 10 questions pour obtenir un parcours clair, personnalisé et réaliste, du brevet jusqu'au bac+5."),
    loadingTitle: getText(language, "quiz", "loadingTitle", "Analyse du profil en cours..."),
    loadingBody: getText(language, "quiz", "loadingBody", "Je prépare un parcours simple, lisible et cohérent avec ton profil."),
    unavailableTitle: getText(language, "quiz", "unavailableTitle", "Parcours indisponible"),
    resultTitle: getText(language, "quiz", "resultTitle", "Ton parcours recommandé"),
    restart: getText(language, "quiz", "restart", "Recommencer"),
    questionLabel: getText(language, "quiz", "questionLabel", "Question"),
    guidedPathway: getText(language, "quiz", "guidedPathway", "Parcours guidé"),
    analyzedProfile: getText(language, "quiz", "analyzedProfile", "Profil détecté"),
    currentLevel: getText(language, "quiz", "currentLevel", "Ton niveau actuel"),
    pathwayLabel: getText(language, "quiz", "pathwayLabel", "Chemin"),
    definitionLabel: getText(language, "quiz", "definitionLabel", "Définition"),
    officialSheet: getText(language, "quiz", "officialSheet", "Voir la fiche officielle"),
    invalidProfile: getText(language, "quiz", "invalidProfile", "Impossible de proposer un parcours pour ce profil. Vérifie tes réponses ou réessaie plus tard."),
    tickSoundOn: getText(language, "quizMeta", "tickSoundOn", "Son : activé"),
    tickSoundOff: getText(language, "quizMeta", "tickSoundOff", "Son : coupé"),
    tickSoundAria: getText(
      language,
      "quizMeta",
      "tickSoundAria",
      "Activer ou désactiver le petit son lors de la validation d’une réponse",
    ),
    questionNavAria: getText(language, "quizMeta", "questionNav", "Navigation du questionnaire"),
    quizPrevAria: getText(language, "quizMeta", "quizPrev", "Question précédente"),
    quizNextAria: getText(language, "quizMeta", "quizNext", "Question suivante"),
    sidePanelAria: getText(language, "quizMeta", "sidePanelAria", "Résumé du parcours"),
    chooseToContinue: getText(language, "quizMeta", "chooseToContinue", "Choisis une réponse pour continuer"),
    sideArrowsBody: getText(
      language,
      "quizMeta",
      "sideArrowsBody",
      "Les flèches te permettent de corriger ou confirmer ton parcours à tout moment pendant le questionnaire.",
    ),
    noAnswer: getText(language, "quizMeta", "noAnswer", "Aucune réponse"),
    selectOptionHint: getText(
      language,
      "quizMeta",
      "selectOption",
      "Sélectionne une option pour voir le résumé ici.",
    ),
    errorTitle: getText(language, "quizMeta", "errorTitle", "Une erreur est survenue"),
    retry: getText(language, "quizMeta", "retry", "Réessayer"),
  };

  const answerQuestion = useCallback((questionId, value) => {
    if (advancingSyncRef.current) return;
    advancingSyncRef.current = true;
    clearAdvanceTimer();
    setAdvancing(true);
    setAnswers((prev) => {
      const next = { ...prev };
      QUESTION_ORDER.slice(QUESTION_ORDER.indexOf(questionId) + 1).forEach((q) => delete next[q]);
      next[questionId] = value;
      return next;
    });

    const finish = () => {
      advanceTimerRef.current = null;
      advancingSyncRef.current = false;
      setAdvancing(false);
    };

    if (questionId === QUESTION_ORDER[QUESTION_ORDER.length - 1]) {
      advanceTimerRef.current = setTimeout(() => {
        setStepIndex(QUESTION_ORDER.length);
        setPhase("loading");
        finish();
      }, QUIZ_ADVANCE_DELAY_MS);
      return;
    }

    const qIdx = QUESTION_ORDER.indexOf(questionId);
    advanceTimerRef.current = setTimeout(() => {
      setStepIndex(qIdx + 1);
      finish();
    }, QUIZ_ADVANCE_DELAY_MS);
  }, [clearAdvanceTimer]);

  useEffect(() => {
    if (phase !== "loading") return;
    let cancelled = false;
    (async () => {
      try {
        const { conversation_id } = await apiPost("/api/conversations", {
          quiz_answers: {
            q1: normalizeAnswer(answers.q1),
            q2: normalizeAnswer(answers.q2),
            q3: normalizeAnswer(answers.q3),
            q4: answers.q4,
            q5: normalizeAnswer(answers.q5),
            q6: normalizeAnswer(answers.q6),
            q7: normalizeAnswer(answers.q7),
            q8: normalizeAnswer(answers.q8),
            q9: normalizeAnswer(answers.q9),
            q10: normalizeAnswer(answers.q10),
          },
        });
        if (!cancelled) {
          clearQuizDraft();
          setLastConversationId(conversation_id);
          navigate(`/assistant?cid=${conversation_id}`);
        }
      } catch (e) {
        if (!cancelled) {
          setApiError(e.message || "Erreur");
          setPhase("error");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [phase, answers, navigate]);

  useEffect(() => {
    if (phase === "quiz") scrollToEl(quizAnchor.current);
    if (phase === "loading") scrollToEl(loaderAnchor.current);
  }, [phase, stepIndex]);

  useEffect(() => {
    if (phase !== "quiz") return;
    const id = window.setTimeout(() => {
      saveQuizDraft({ answers, stepIndex, phase: "quiz" });
    }, 500);
    return () => window.clearTimeout(id);
  }, [answers, stepIndex, phase]);

  const resetQuestionnaire = () => {
    clearAdvanceTimer();
    advancingSyncRef.current = false;
    setAdvancing(false);
    clearQuizDraft();
    setAnswers({});
    setStepIndex(0);
    setPhase("quiz");
    setApiError("");
    setResumeBanner(false);
  };

  const goBack = () => {
    clearAdvanceTimer();
    advancingSyncRef.current = false;
    setAdvancing(false);
    if (phase === "loading" || phase === "error") {
      setPhase("quiz");
      setApiError("");
      setStepIndex(QUESTION_ORDER.length - 1);
      return;
    }
    if (stepIndex > 0) setStepIndex((s) => s - 1);
  };

  const goNext = () => {
    if (advancingSyncRef.current) return;
    if (phase !== "quiz" || !currentAnswer) return;
    advancingSyncRef.current = true;
    setAdvancing(true);
    clearAdvanceTimer();
    const finish = () => {
      advanceTimerRef.current = null;
      advancingSyncRef.current = false;
      setAdvancing(false);
    };
    if (isLastQuestion) {
      advanceTimerRef.current = setTimeout(() => {
        setStepIndex(QUESTION_ORDER.length);
        setPhase("loading");
        finish();
      }, QUIZ_ADVANCE_DELAY_MS);
      return;
    }
    advanceTimerRef.current = setTimeout(() => {
      setStepIndex((s) => Math.min(s + 1, QUESTION_ORDER.length - 1));
      finish();
    }, QUIZ_ADVANCE_DELAY_MS);
  };

  const goHome = () => {
    clearAdvanceTimer();
    advancingSyncRef.current = false;
    setAdvancing(false);
    clearQuizDraft();
    setAnswers({});
    setStepIndex(0);
    setPhase("quiz");
    setApiError("");
    setResumeBanner(false);
    navigate("/", { replace: true });
  };

  const handleLogout = () => {
    logoutUser();
    navigate("/auth", { replace: true });
  };

  const renderQ4 = () => {
    if (!domain || !specialtyConfig[domain]) return null;
    return (
      <div className="choices">
        {specialtyConfig[domain].map((item) => (
          <ChoiceButton
            key={item.value}
            title={item.title}
            sub={item.sub}
            active={answers.q4 === item.value}
            disabled={advancing}
            onClick={() => answerQuestion("q4", item.value)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="app quiz-app">
      <div className="top-actions quiz-top">
        <Link to="/" className="quiz-site-link">← Moov&apos;Up</Link>
        <div className="quiz-top-btns">
          <span className="user-pill">{session?.pseudo || "Utilisateur"}</span>
          <button
            type="button"
            className="nav-btn secondary quiz-tick-toggle"
            aria-pressed={quizTickSound}
            aria-label={ui.tickSoundAria}
            onClick={() => setQuizTickSoundEnabled(!quizTickSound)}
          >
            {quizTickSound ? ui.tickSoundOn : ui.tickSoundOff}
          </button>
          <button type="button" className="nav-btn secondary" disabled={!canBack} onClick={goBack}>{ui.back}</button>
          <button type="button" className="nav-btn primary" onClick={goHome}>{ui.home}</button>
          <button type="button" className="nav-btn secondary" onClick={handleLogout}>{ui.logout}</button>
        </div>
      </div>

      <section className="hero" ref={quizAnchor}>
        <span className="eyebrow">{ui.guidedPathway}</span>
        <h1>{ui.title}</h1>
        <p>{ui.intro}</p>
        {phase === "quiz" && resumeBanner ? (
          <div className="quiz-resume-banner" role="status">
            <p>Ton questionnaire a été repris automatiquement là où tu t’étais arrêté.</p>
            <div className="quiz-resume-banner-actions">
              <button type="button" className="nav-btn secondary" onClick={() => setResumeBanner(false)}>
                OK
              </button>
              <button type="button" className="nav-btn primary" onClick={resetQuestionnaire}>
                {ui.restart}
              </button>
            </div>
          </div>
        ) : null}
        <div className="progress-wrap">
          <div className="progress-meta">
            <span>{progressText}</span>
            <span>{animatedProgress}%</span>
          </div>
          <div className="progress-bar">
            <span style={{ width: `${animatedProgress}%` }} />
          </div>
        </div>
      </section>

      {phase === "quiz" && currentQuestion && (
        <section className="quiz-stage">
          <section className="panel quiz-question-panel">
            <div className="quiz-question-head">
              <div>
                <div className="question-number">{ui.questionLabel} {stepIndex + 1}</div>
                <h2>{translatedQuestion?.title || currentQuestion.title}</h2>
              </div>
              <div className={`quiz-step-badge${checkPulse ? " is-validating" : ""}`}>
                <span>{answeredCount}/10 complétées</span>
                {checkPulse ? <span className="quiz-step-check" aria-hidden="true">✓</span> : null}
              </div>
            </div>
            <p>{translatedQuestion?.body || currentQuestion.body}</p>
            {currentQuestionId === "q4" ? (
              renderQ4()
            ) : (
              <div className="choices">
                {translatedChoices.map((c) => (
                  <ChoiceButton
                    key={`${c.value}-${c.title}`}
                    {...c}
                    active={answers[currentQuestionId] === c.value}
                    disabled={advancing}
                    onClick={() => answerQuestion(currentQuestionId, c.value)}
                  />
                ))}
              </div>
            )}
            <div className="question-arrows" aria-label={ui.questionNavAria}>
              <button
                type="button"
                className="nav-btn secondary question-arrow-btn"
                onClick={goBack}
                disabled={!canGoPrev}
                aria-label={ui.quizPrevAria}
              >
                ←
              </button>
              <div className="question-rail">
                <span className="question-rail-label">{progressText}</span>
                <span className="question-rail-copy">
                  {currentChoice ? currentChoice.title : ui.chooseToContinue}
                </span>
              </div>
              <button
                type="button"
                className="nav-btn primary question-arrow-btn"
                onClick={goNext}
                disabled={!canGoNext}
                aria-label={ui.quizNextAria}
              >
                →
              </button>
            </div>
          </section>

          <aside className="quiz-side" aria-label={ui.sidePanelAria}>
            <div className="quiz-side-card quiz-side-card-highlight">
              <p className="quiz-side-kicker">{getText(language, "quizMeta", "smoothNavigation", "Navigation fluide")}</p>
              <h3>{getText(language, "quizMeta", "goBack", "Reviens en arrière sans perdre tes réponses.")}</h3>
              <p>{ui.sideArrowsBody}</p>
            </div>
            <div className="quiz-side-card">
              <p className="quiz-side-kicker">{getText(language, "quizMeta", "currentAnswer", "Réponse actuelle")}</p>
              <h3>{currentChoice ? currentChoice.title : ui.noAnswer}</h3>
              <p>{currentChoice?.sub || ui.selectOptionHint}</p>
            </div>
            <div className="quiz-side-card">
              <p className="quiz-side-kicker">{getText(language, "quizMeta", "questionRecap", "Rappel de la question")}</p>
              <h3>{translatedQuestion?.title || currentQuestion.title}</h3>
              <p>{translatedQuestion?.body || currentQuestion.body}</p>
            </div>
          </aside>
        </section>
      )}

      {phase === "loading" && (
        <section className="panel loader show" ref={loaderAnchor}>
          <div className="spinner" />
          <h3>{ui.loadingTitle}</h3>
          <p>{ui.loadingBody}</p>
        </section>
      )}

      {phase === "error" && (
        <section className="panel" style={{ maxWidth: 600, margin: "0 auto" }}>
          <h3>{ui.errorTitle}</h3>
          <p>{apiError}</p>
          <button type="button" className="nav-btn primary" onClick={() => { setApiError(""); setPhase("quiz"); setStepIndex(QUESTION_ORDER.length - 1); }}>
            {ui.retry}
          </button>
        </section>
      )}
    </div>
  );
}
