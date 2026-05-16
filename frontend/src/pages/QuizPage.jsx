import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../data/apiClient.js";
import { getSession, logoutUser } from "../data/authStorage.js";
import { clearQuizDraft, loadQuizDraft, saveQuizDraft } from "../data/quizDraftStorage.js";
import { setLastConversationId } from "../data/conversationStorage.js";
import { getQuizChoiceText, getQuizQuestionText, getText } from "../data/translations.js";
import { mapUiQuizAnswersToBackend } from "../data/quizAnswerMapping.js";
import { playQuizTickSound } from "../data/quizTickSound.js";
import { useUiPreferences } from "../hooks/useUiPreferences.js";
import { useNavigateBack } from "../hooks/useNavigateBack.js";
import { TopBarAccountTools } from "../components/TopBarAccountTools.jsx";
import { getQuestionOrder, specialtyConfig } from "../data/orientationHelpers.js";
import { orderActivityChoicesForDomain } from "../data/quizQuestionHelpers.js";
import { getSpecialtyChoiceText } from "../data/specialtyLabels.js";

/** Pause après chaque choix avant la question suivante (ou avant l’analyse finale), en ms. */
const QUIZ_ADVANCE_DELAY_MS = 500;

const Q1_CHOICES = [
  { value: "tech", title: "Technologie", sub: "Informatique, IA, cybersécurité, code, data" },
  { value: "business", title: "Business & commerce", sub: "Marketing, vente, finance, gestion" },
  { value: "communication", title: "Communication & médias", sub: "Journalisme, réseaux sociaux, publicité, contenu" },
  { value: "creative", title: "Création visuelle", sub: "Design, graphisme, audiovisuel, animation" },
  { value: "sante", title: "Santé & bien-être", sub: "Médical, psychologie, sport, accompagnement" },
  { value: "education", title: "Éducation & social", sub: "Enseignement, aide, insertion, éducation" },
  { value: "droit", title: "Droit & politique", sub: "Justice, avocat, institutions, géopolitique" },
  { value: "industrie", title: "Industrie & ingénierie", sub: "Production, mécanique, ingénierie, maintenance" },
  { value: "batiment", title: "Bâtiment & architecture", sub: "Construction, urbanisme, architecture" },
  { value: "agriculture", title: "Environnement & agriculture", sub: "Nature, écologie, agriculture, développement durable" },
  { value: "service", title: "Tourisme & événementiel", sub: "Voyage, hôtellerie, organisation d’événements" },
];

const Q1_DOMAIN_LABELS = Object.fromEntries(Q1_CHOICES.map((c) => [c.value, c.title]));

const Q2_CHOICES = [
  { value: "creer-visuels", title: "Créer des visuels ou vidéos", sub: "Imaginer, designer, filmer, monter" },
  { value: "ecrire-raconter", title: "Écrire ou raconter des histoires", sub: "Rédiger, informer, raconter, transmettre" },
  { value: "parler-convaincre", title: "Parler, convaincre ou débattre", sub: "Communiquer, présenter, interviewer" },
  { value: "aider-accompagner", title: "Aider et accompagner des personnes", sub: "Écouter, conseiller, soutenir" },
  { value: "analyser-comprendre", title: "Analyser et comprendre des sujets", sub: "Chercher, réfléchir, enquêter" },
  { value: "creer-projets", title: "Créer des projets ou entreprendre", sub: "Lancer des idées, construire quelque chose" },
  { value: "resoudre-tech", title: "Résoudre des problèmes techniques", sub: "Trouver des solutions, coder, réparer" },
  { value: "organiser-gerer", title: "Organiser et gérer", sub: "Planifier, coordonner, gérer des équipes" },
];

const Q3_CHOICES = [
  { value: "bureau", title: "Bureau", sub: "En entreprise, dans un cadre structuré" },
  { value: "laboratoire", title: "Laboratoire", sub: "En recherche ou expérimentation" },
  { value: "terrain", title: "Terrain", sub: "Sur le terrain, au contact direct" },
  { value: "itinerant", title: "Itinérant", sub: "En déplacement, sur plusieurs lieux" },
  { value: "distanciel", title: "À distance", sub: "En télétravail ou en ligne" },
];

const Q4_CHOICES = [
  { value: "pratique", title: "Pratique", sub: "J'aime manipuler, tester, construire" },
  { value: "equilibre", title: "Équilibré", sub: "J'aime autant la pratique que la théorie" },
  { value: "theorie", title: "Théorique", sub: "J'aime comprendre avant d'appliquer" },
];

const Q5_CHOICES = [
  { value: "fort", title: "À l'aise", sub: "J'aime les chiffres et la logique" },
  { value: "moyen", title: "Correct", sub: "Je me débrouille sans en faire ma priorité" },
  { value: "faible", title: "Pas mon point fort", sub: "Je préfère d'autres approches" },
];

const Q6_CHOICES = [
  { value: "encadre", title: "Encadré", sub: "J'ai besoin d'un cadre clair et régulier" },
  { value: "mixte", title: "Mixte", sub: "Un mélange de guidance et d'autonomie" },
  { value: "autonome", title: "Autonome", sub: "J'aime apprendre seul et décider" },
];

const Q7_CHOICES = [
  { value: "insertion", title: "Trouver un emploi rapidement", sub: "Entrer vite dans la vie active" },
  { value: "expertise", title: "Devenir expert·e", sub: "Viser la spécialisation dans un domaine" },
  { value: "flexibilite", title: "Garder des options ouvertes", sub: "Ne pas se fermer trop tôt" },
  { value: "creation", title: "Créer mon activité", sub: "Entrepreneuriat, freelance, projet perso" },
];

const Q8_CHOICES = [
  { value: "college", title: "Collège", sub: "Je suis au collège (3e ou moins)" },
  { value: "seconde", title: "Seconde", sub: "Je suis en seconde ou première" },
  { value: "terminale", title: "Terminale", sub: "Je prépare le bac cette année" },
  { value: "bac", title: "Bac", sub: "J'ai déjà le bac" },
  { value: "bac2", title: "Bac+2", sub: "BTS, BUT, DEUST" },
  { value: "bac3", title: "Bac+3", sub: "Licence, bachelor" },
  { value: "bac5", title: "Bac+5", sub: "Master, école d'ingénieurs, MBA" },
];

const Q9_CHOICES = [
  { value: "local", title: "Près de chez moi", sub: "Je reste dans ma région" },
  { value: "mobile", title: "Mobile", sub: "Je peux bouger en France" },
  { value: "international", title: "International", sub: "Je peux partir à l'étranger" },
  { value: "distanciel", title: "À distance", sub: "Je préfère les formations en ligne" },
];

const Q10_CHOICES = [
  { value: "info", title: "Manque d'informations", sub: "Je ne sais pas quels métiers ou formations existent" },
  { value: "peur", title: "Peur de me tromper", sub: "J'ai peur de faire le mauvais choix" },
  { value: "pression", title: "Pression familiale ou sociale", sub: "Les attentes des autres pèsent sur moi" },
  { value: "indecision", title: "Trop d'options", sub: "Je suis partagé·e entre plusieurs pistes" },
];

const BASE_QUESTIONS = [
  {
    id: "q1",
    title: "Quels domaines t’attirent le plus ?",
    body: "Choisis les secteurs qui t’intéressent naturellement.",
    choices: Q1_CHOICES,
  },
  {
    id: "q2",
    title: "Qu’est-ce que tu préfères faire naturellement ?",
    body: "Choisis les activités dans lesquelles tu te reconnais le plus.",
    choices: Q2_CHOICES,
  },
  {
    id: "q3",
    title: "Tu préfères travailler :",
    body: "L’environnement de travail joue beaucoup sur l’épanouissement.",
    choices: Q3_CHOICES,
  },
  {
    id: "q4",
    title: "Quand tu apprends quelque chose, tu préfères :",
    body: "Ça permet d’identifier les formations où tu pourrais être le plus à l’aise.",
    choices: Q4_CHOICES,
  },
  {
    id: "q5",
    title: "Les matières logiques (maths, code, analyse…) c’est plutôt :",
    body: "Certaines filières demandent plus de logique ou d’analyse que d’autres.",
    choices: Q5_CHOICES,
  },
  {
    id: "q6",
    title: "Tu te considères plutôt comme quelqu’un de :",
    body: "Il n’y a pas de bon profil, seulement des métiers plus adaptés à chacun.",
    choices: Q6_CHOICES,
  },
  {
    id: "q7",
    title: "Dans ton futur métier, qu’est-ce qui compte le plus pour toi ?",
    body: "Chaque personne recherche quelque chose de différent dans son avenir.",
    choices: Q7_CHOICES,
  },
  {
    id: "q8",
    title: "Aujourd’hui, tu es :",
    body: "Ça nous aide à proposer des formations réalistes et accessibles.",
    choices: Q8_CHOICES,
  },
  {
    id: "q9",
    title: "Pour tes études ou ton travail, tu serais prêt·e à :",
    body: "La mobilité peut ouvrir plus ou moins d’opportunités.",
    choices: Q9_CHOICES,
  },
  {
    id: "q10",
    title: "Aujourd’hui, qu’est-ce qui te bloque le plus dans ton orientation ?",
    body: "Comprendre tes freins nous aide à mieux t’accompagner.",
    choices: Q10_CHOICES,
  },
];

function scrollToEl(element) {
  element?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function sanitizeAnswersFromDraft(raw) {
  if (!raw || typeof raw !== "object") return {};
  const out = {};
  const order = getQuestionOrder(raw);
  for (const qid of order) {
    const v = raw[qid];
    if (v != null && String(v).trim() !== "") out[qid] = v;
    else break;
  }
  return out;
}

function firstIncompleteStepIndex(answers) {
  const order = getQuestionOrder(answers);
  for (let i = 0; i < order.length; i++) {
    if (!answers[order[i]]) return i;
  }
  return order.length;
}

function resolveQuestion(questionId, answers, language) {
  if (questionId === "q2" && answers.q1) {
    const base = BASE_QUESTIONS.find((q) => q.id === "q2");
    if (!base) return null;
    const translated = getQuizQuestionText(language, "q2");
    const domainLabel = Q1_DOMAIN_LABELS[answers.q1] || answers.q1;
    const bodyTpl = getText(
      language,
      "quizMeta",
      "q2BodyAfterDomain",
      "Tu as choisi {domain} : quelle activité te ressemble le plus au quotidien ? (ça affine ton profil au-delà du secteur seul.)",
    );
    return {
      ...base,
      title: translated?.title || base.title,
      body: bodyTpl.replace(/\{domain\}/g, domainLabel),
      choices: orderActivityChoicesForDomain(answers.q1, base.choices),
    };
  }
  if (questionId === "qSpec") {
    const domain = answers.q1;
    const items = specialtyConfig[domain] || [];
    const translated = getQuizQuestionText(language, "qSpec");
    return {
      id: "qSpec",
      title: translated?.title || "Dans ce domaine, quelle piste te parle le plus ?",
      body: translated?.body || "On cible la famille de métiers et les études qui y mènent.",
      choices: items.map(({ value }) => {
        const t = getSpecialtyChoiceText(language, domain, value, {});
        return {
          value,
          title: t.title || value,
          sub: t.sub || "",
        };
      }),
    };
  }
  return BASE_QUESTIONS.find((q) => q.id === questionId) || null;
}

function readInitialQuizFromDraft() {
  const d = loadQuizDraft();
  if (d?.phase === "quiz" && d.answers && typeof d.answers === "object" && typeof d.stepIndex === "number") {
    const answers = sanitizeAnswersFromDraft(d.answers);
    const incomplete = firstIncompleteStepIndex(answers);
    const orderLen = getQuestionOrder(answers).length;
    const stepIndex = Math.min(Math.max(0, d.stepIndex), incomplete, orderLen - 1);
    return {
      answers,
      stepIndex,
      phase: "quiz",
      hadDraft: Object.keys(answers).length > 0,
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
  const leaveToPreviousPage = useNavigateBack(session ? "/choice" : "/");
  const { language, theme, quizTickSound } = useUiPreferences();
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
  const questionOrder = useMemo(() => getQuestionOrder(answers), [answers]);
  const questionTotal = questionOrder.length;
  const currentQuestionId = questionOrder[stepIndex];
  const currentQuestion = resolveQuestion(currentQuestionId, answers, language);
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
  const isLastQuestion = stepIndex === questionTotal - 1;
  const progressPercent = Math.round((stepIndex / questionTotal) * 100);
  const stepLabelTpl = getText(
    language,
    "quizMeta",
    "step",
    `Question ${stepIndex + 1} of ${questionTotal}`,
  );
  const progressText =
    stepIndex < questionTotal
      ? stepLabelTpl
          .replace(/\{n\}/g, String(stepIndex + 1))
          .replace(/\{total\}/g, String(questionTotal))
      : getText(language, "quizMeta", "pathGenerated", "Path generated");
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
  const currentChoice =
    !currentAnswer
      ? null
      : translatedChoices.find((choice) => choice.value === currentAnswer) ||
        currentQuestion?.choices?.find((choice) => choice.value === currentAnswer) ||
        null;

  const ui = {
    back: getText(language, "quiz", "back", "Back"),
    home: getText(language, "quiz", "home", "Home"),
    logout: getText(language, "quiz", "logout", "Sign out"),
    title: getText(language, "quiz", "title", "Moov'Up"),
    intro: getText(
      language,
      "quiz",
      "intro",
      "Answer 10 questions to get a clear, personalized and realistic path from middle school to master's level.",
    ),
    loadingTitle: getText(language, "quiz", "loadingTitle", "Analyzing profile..."),
    loadingBody: getText(
      language,
      "quiz",
      "loadingBody",
      "Preparing a simple, readable path aligned with your profile.",
    ),
    unavailableTitle: getText(language, "quiz", "unavailableTitle", "Path unavailable"),
    resultTitle: getText(language, "quiz", "resultTitle", "Your recommended path"),
    restart: getText(language, "quiz", "restart", "Restart"),
    questionLabel: getText(language, "quizMeta", "questionLabel", "Question"),
    guidedPathway: getText(language, "quizMeta", "guidedPathway", "Guided pathway"),
    analyzedProfile: getText(language, "quizMeta", "analyzedProfile", "Detected profile"),
    currentLevel: getText(language, "quizMeta", "currentLevel", "Your current level"),
    pathwayLabel: getText(language, "quizMeta", "pathwayLabel", "Path"),
    definitionLabel: getText(language, "quizMeta", "definitionLabel", "Definition"),
    officialSheet: getText(language, "quizMeta", "officialSheet", "View official sheet"),
    invalidProfile: getText(
      language,
      "quizMeta",
      "invalidProfile",
      "We could not suggest a path for this profile. Check your answers or try again later.",
    ),
    questionNavAria: getText(language, "quizMeta", "questionNav", "Questionnaire navigation"),
    quizPrevAria: getText(language, "quizMeta", "quizPrev", "Previous question"),
    quizNextAria: getText(language, "quizMeta", "quizNext", "Next question"),
    sidePanelAria: getText(language, "quizMeta", "sidePanelAria", "Pathway summary"),
    chooseToContinue: getText(language, "quizMeta", "chooseToContinue", "Choose an answer to continue"),
    sideArrowsBody: getText(
      language,
      "quizMeta",
      "sideArrowsBody",
      "Use the arrows to correct or confirm your path at any time during the questionnaire.",
    ),
    noAnswer: getText(language, "quizMeta", "noAnswer", "No answer"),
    selectOptionHint: getText(
      language,
      "quizMeta",
      "selectOption",
      "Select an option to see the summary here.",
    ),
    errorTitle: getText(language, "quizMeta", "errorTitle", "Something went wrong"),
    retry: getText(language, "quizMeta", "retry", "Try again"),
    resumeDraftBody: getText(
      language,
      "quizMeta",
      "resumeDraftBody",
      "Your questionnaire was resumed automatically where you left off.",
    ),
    resumeDraftOk: getText(language, "quizMeta", "resumeDraftOk", "OK"),
    questionProgress: getText(language, "quizMeta", "questionProgress", "{answered}/{total} completed"),
  };

  const answerQuestion = useCallback((questionId, value) => {
    if (advancingSyncRef.current) return;
    advancingSyncRef.current = true;
    clearAdvanceTimer();
    setAdvancing(true);

    const finish = () => {
      advanceTimerRef.current = null;
      advancingSyncRef.current = false;
      setAdvancing(false);
    };

    setAnswers((prev) => {
      const next = { ...prev };
      getQuestionOrder({ ...prev, [questionId]: value })
        .slice(getQuestionOrder(prev).indexOf(questionId) + 1)
        .forEach((q) => delete next[q]);
      next[questionId] = value;
      const orderAfter = getQuestionOrder(next);

      if (questionId === orderAfter[orderAfter.length - 1]) {
        advanceTimerRef.current = setTimeout(() => {
          setStepIndex(orderAfter.length);
          setPhase("loading");
          finish();
        }, QUIZ_ADVANCE_DELAY_MS);
      } else {
        const qIdx = orderAfter.indexOf(questionId);
        advanceTimerRef.current = setTimeout(() => {
          setStepIndex(qIdx + 1);
          finish();
        }, QUIZ_ADVANCE_DELAY_MS);
      }
      return next;
    });
  }, [clearAdvanceTimer]);

  useEffect(() => {
    if (phase !== "loading") return;
    let cancelled = false;
    (async () => {
      try {
        const { conversation_id } = await apiPost("/api/conversations", {
          quiz_answers: mapUiQuizAnswersToBackend(answers),
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

  useEffect(() => {
    if (phase !== "quiz") return;
    if (stepIndex >= questionTotal) {
      setStepIndex(Math.max(0, questionTotal - 1));
    }
  }, [phase, stepIndex, questionTotal]);

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
      setStepIndex(Math.max(0, questionTotal - 1));
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
        setStepIndex(questionTotal);
        setPhase("loading");
        finish();
      }, QUIZ_ADVANCE_DELAY_MS);
      return;
    }
    advanceTimerRef.current = setTimeout(() => {
      setStepIndex((s) => Math.min(s + 1, questionTotal - 1));
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

  return (
    <div className={`app quiz-app ${theme}`}>
      <div className="top-actions quiz-top">
        <button
          type="button"
          className="quiz-site-link"
          onClick={leaveToPreviousPage}
          aria-label={getText(language, "common", "navBackAria", "Revenir à la page précédente")}
        >
          ← {getText(language, "common", "back", "Retour")}
        </button>
        <div className="quiz-top-btns">
          <TopBarAccountTools className="quiz-top-tools" />
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
            <p>{ui.resumeDraftBody}</p>
            <div className="quiz-resume-banner-actions">
              <button type="button" className="nav-btn secondary" onClick={() => setResumeBanner(false)}>
                {ui.resumeDraftOk}
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
          <section className="panel quiz-question-panel" key={currentQuestionId}>
            <div className="quiz-question-head">
              <div>
                <div className="question-number">{ui.questionLabel} {stepIndex + 1}</div>
                <h2>{translatedQuestion?.title || currentQuestion.title}</h2>
              </div>
              <div className={`quiz-step-badge${checkPulse ? " is-validating" : ""}`}>
                <span>
                  {ui.questionProgress
                    .replace(/\{answered\}/g, String(stepIndex + 1))
                    .replace(/\{total\}/g, String(questionTotal))}
                </span>
                {checkPulse ? <span className="quiz-step-check" aria-hidden="true">✓</span> : null}
              </div>
            </div>
            <p>{translatedQuestion?.body || currentQuestion.body}</p>
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
              <p className="quiz-side-kicker">{getText(language, "quizMeta", "smoothNavigation", "Smooth navigation")}</p>
              <h3>{getText(language, "quizMeta", "goBack", "Go back without losing your answers.")}</h3>
              <p>{ui.sideArrowsBody}</p>
            </div>
            <div className="quiz-side-card">
              <p className="quiz-side-kicker">{getText(language, "quizMeta", "currentAnswer", "Current answer")}</p>
              <h3>{currentChoice ? currentChoice.title : ui.noAnswer}</h3>
              <p>{currentChoice?.sub || ui.selectOptionHint}</p>
            </div>
            <div className="quiz-side-card">
              <p className="quiz-side-kicker">{getText(language, "quizMeta", "questionRecap", "Question recap")}</p>
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
          <button type="button" className="nav-btn primary" onClick={() => { setApiError(""); setPhase("quiz"); setStepIndex(Math.max(0, questionTotal - 1)); }}>
            {ui.retry}
          </button>
        </section>
      )}
    </div>
  );
}
