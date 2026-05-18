import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getLastConversationId } from "../data/conversationStorage.js";
import ReactMarkdown from "react-markdown";
import {
  apiGet,
  apiPost,
  humanizeApiErrorMessage,
  isConversationNotFoundMessage,
} from "../data/apiClient.js";
import { getSession, logoutUser } from "../data/authStorage.js";
import { clearLastConversationId } from "../data/conversationStorage.js";
import { getPartenairesOffer } from "../data/partenairesSession.js";
import { TopBarAccountTools } from "../components/TopBarAccountTools.jsx";
import PathwaySummaryModal from "../components/PathwaySummaryModal.jsx";
import RecommendedFormationsList from "../components/RecommendedFormationsList.jsx";
import { useTranslation } from "../hooks/useTranslation.js";
import { useNavigateBack } from "../hooks/useNavigateBack.js";
import { stripTrailingOnisepFromAssistantText } from "../data/chatMessageCleanup.js";
import { detectLegacyCoachStubReply } from "../data/chatLegacyStub.js";
import { localizeRecommendations } from "../data/localizeRecommendations.js";
import { getCoachQuotaState, reconcileCoachUsageAfterSend, syncCoachUsageFromHistory } from "../data/usageQuota.js";

function useQueryParam(key) {
  const { search } = useLocation();
  return new URLSearchParams(search).get(key);
}

function BrandMark() {
  return (
    <span className="chatbot-nav-logo" aria-hidden>
      <svg className="chatbot-nav-logo-svg" viewBox="0 0 36 36" width="38" height="38">
        <defs>
          <linearGradient id="moovBrandMarkGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#40e0d0" />
            <stop offset="100%" stopColor="#80e8ff" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="34" height="34" rx="10" fill="url(#moovBrandMarkGrad)" />
        <path
          d="M11 24V12l5.5 6.5L22 11l5 13H11z"
          fill="#061525"
          opacity="0.9"
        />
      </svg>
    </span>
  );
}

function CoachAvatar({ title }) {
  return (
    <div className="chat-avatar assistant chat-avatar--icon" aria-hidden title={title}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7a2.5 2.5 0 0 1-2.5 2.5h-3.2L9 20v-5H6.5A2.5 2.5 0 0 1 4 12.5v-7z" />
      </svg>
    </div>
  );
}

function MessageBubble({ role, content, userInitial, youTitle, coachTitle }) {
  const isUser = role === "user";
  const initial = (userInitial && String(userInitial).trim()[0]) || "?";
  const displayContent = isUser ? content : stripTrailingOnisepFromAssistantText(content);
  return (
    <div className={`chat-msg-row ${isUser ? "user" : "assistant"}`}>
      {!isUser && <CoachAvatar title={coachTitle} />}
      <div className={`chat-bubble ${isUser ? "user" : "assistant"}`}>
        {isUser ? (
          <p className="chat-bubble-text">{displayContent}</p>
        ) : (
          <div className="chat-bubble-md">
            <ReactMarkdown>{displayContent}</ReactMarkdown>
          </div>
        )}
      </div>
      {isUser && (
        <div className="chat-avatar user" aria-hidden title={youTitle}>
          {initial.toUpperCase()}
        </div>
      )}
    </div>
  );
}

function TypingIndicator({ typingAria, coachTitle }) {
  return (
    <div className="chat-msg-row assistant">
      <CoachAvatar title={coachTitle} />
      <div className="chat-bubble assistant typing" aria-label={typingAria}>
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}

export default function ChatbotPage() {
  const { t, language } = useTranslation();
  const tc = (key, fallback) => t("coach", key, fallback);
  const navigate = useNavigate();
  const goBackPage = useNavigateBack("/choice");
  const cid = useQueryParam("cid");
  const session = getSession();
  const userInitial = session?.email?.trim()?.[0] ?? "?";
  const [conv, setConv] = useState(null);
  const [history, setHistory] = useState([]);
  const [rawRecs, setRawRecs] = useState([]);
  const [recs, setRecs] = useState([]);
  const [localizingRecs, setLocalizingRecs] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [convLoadState, setConvLoadState] = useState("loading");
  const [pathwayOpen, setPathwayOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [apiHealth, setApiHealth] = useState(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  const focusComposerForFormation = (metierLabel, formation) => {
    const metier = String(metierLabel || "").trim();
    const form = String(formation?.libelle || formation || "").trim();
    let prompt = tc(
      "askFormationPromptSingle",
      "Parle-moi de la formation « {formation} » pour le métier {metier} : contenu, débouchés, conditions d'accès et si elle me convient."
    );
    if (form) prompt = prompt.replace(/\{formation\}/g, form);
    else prompt = prompt.replace(/[«"]?\{formation\}[»"]?\s*/g, "");
    if (metier) prompt = prompt.replace(/\{metier\}/g, metier);
    else prompt = prompt.replace(/\{metier\}/g, "que tu m'as recommandé");
    setInput(prompt);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      el?.focus();
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  useEffect(() => {
    if (cid) return;
    const last = getLastConversationId();
    if (last) {
      navigate(`/assistant?cid=${last}`, { replace: true });
      return;
    }
    navigate("/demo", { replace: true });
  }, [cid, navigate]);

  useEffect(() => {
    if (!cid) return;
    apiGet("/api/health")
      .then(setApiHealth)
      .catch(() => setApiHealth(null));
  }, [cid]);

  const convNotFoundFallback = tc("convNotFound", "Conversation introuvable");

  const handleConversationMissing = () => {
    clearLastConversationId();
    setConv(null);
    setHistory([]);
    setRawRecs([]);
    setRecs([]);
    setConvLoadState("not_found");
    setError(convNotFoundFallback);
  };

  useEffect(() => {
    if (!cid) return;
    setConvLoadState("loading");
    setError("");
    apiGet(`/api/conversations/${cid}`)
      .then((c) => {
        setConv(c);
        const msgs = c.messages || [];
        syncCoachUsageFromHistory(msgs);
        setHistory(msgs);
        setRawRecs(c.initial_recommendations || []);
        setConvLoadState("ready");
      })
      .catch((e) => {
        if (isConversationNotFoundMessage(e.message)) {
          handleConversationMissing();
          return;
        }
        setConvLoadState("error");
        setError(
          humanizeApiErrorMessage(e.message, convNotFoundFallback)
        );
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rechargement lié au cid uniquement
  }, [cid]);

  useEffect(() => {
    if (!rawRecs.length) {
      setRecs([]);
      return undefined;
    }
    let cancelled = false;
    setLocalizingRecs(true);
    localizeRecommendations(rawRecs, language)
      .then((localized) => {
        if (!cancelled) setRecs(localized);
      })
      .finally(() => {
        if (!cancelled) setLocalizingRecs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rawRecs, language]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, sending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const send = async (e) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    const quota = getCoachQuotaState();
    if (!quota.isUnlimited && quota.blocked) {
      setError(
        tc(
          "quotaExceeded",
          "Tu as atteint la limite gratuite de messages. Passe à l’offre Premium pour continuer à utiliser Moov’Coach sans limite."
        )
      );
      return;
    }
    setSending(true);
    setError("");
    setHistory((h) => [...h, { role: "user", content: trimmed }]);
    setInput("");
    try {
      const res = await apiPost("/api/chat", {
        conversation_id: Number(cid),
        message: trimmed,
        language,
      });
      reconcileCoachUsageAfterSend(res.updated_history || []);
      setHistory(res.updated_history);
      setRawRecs(res.recommended_metiers || []);
    } catch (err) {
      setError(err.message);
      setHistory((h) => h.filter((m, i) => !(i === h.length - 1 && m.role === "user" && m.content === trimmed)));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleLogout = () => { logoutUser(); navigate("/auth", { replace: true }); };

  const greeting = useMemo(() => {
    if (history.length > 0) return null;
    return t(
      "coach",
      "greetingFirst",
      "Pose ta première question (ex : « Quel est le salaire ? », « Et en alternance ? »)."
    );
  }, [history.length, language, t]);

  const legacyStubDetected = useMemo(() => {
    const lastA = [...history].reverse().find((m) => m.role === "assistant");
    return detectLegacyCoachStubReply(lastA?.content);
  }, [history]);

  const devApiMissingOpenRouter =
    apiHealth?.flavor === "nodejs-dev-api" && apiHealth?.coach_llm_configured === false;

  const premiumOffer = getPartenairesOffer()?.offer;
  const coachQuota = useMemo(() => getCoachQuotaState(), [history.length, premiumOffer]);

  const shareUrl =
    cid && typeof window !== "undefined"
      ? `${window.location.origin}/assistant?cid=${encodeURIComponent(cid)}`
      : "";

  const copyConversationLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2400);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = shareUrl;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 2400);
      } catch {
        /* ignore */
      }
    }
  };

  const sharePathway = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: tc("shareNativeTitle", "Mon parcours Moov'Up"),
          text: tc("shareNativeText", "Voici mon parcours généré après le questionnaire Moov'Up."),
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback vers copie si partage natif annulé/indispo.
      }
    }
    await copyConversationLink();
  };

  if (convLoadState === "loading") {
    return (
      <div className="app chatbot-app">
        <p style={{ padding: 40 }}>{tc("loading", "Chargement…")}</p>
      </div>
    );
  }

  const coachTitleStr = tc("coachAvatarTitle", "Moov'Coach");
  const youTitleStr = tc("youTitle", "Toi");
  const typingAriaStr = tc("typingAria", "L'assistant rédige…");

  return (
    <div className="app chatbot-app">
      <header className="chatbot-navbar">
        <div className="chatbot-navbar-inner">
          <div className="chatbot-nav-left">
            <button
              type="button"
              className="chatbot-nav-back"
              onClick={goBackPage}
              aria-label={t("common", "navBackAria", "Revenir à la page précédente")}
            >
              {t("common", "backNav", "← — Retour")}
            </button>
            <Link to="/" className="chatbot-nav-brand" aria-label={tc("brandHomeAria", "Moov'Up — accueil")}>
              <BrandMark />
              <span>Moov&apos;Up</span>
            </Link>
          </div>
          <div className="chatbot-nav-actions">
            <TopBarAccountTools className="chatbot-topbar-tools" />
            <Link to="/demo" className="nav-btn secondary">{tc("retakeQuiz", "Refaire le quiz")}</Link>
            <Link to="/" className="nav-btn secondary">{tc("home", "Accueil")}</Link>
            <button type="button" className="nav-btn primary" onClick={handleLogout}>
              {t("common", "logout", "Se déconnecter")}
            </button>
          </div>
        </div>
      </header>

      {convLoadState === "not_found" ? (
        <section className="panel chatbot-recovery" role="alert">
          <h2 className="chatbot-recovery-title">
            {tc("convNotFoundTitle", "Parcours introuvable")}
          </h2>
          <p className="chatbot-recovery-lead">
            {tc(
              "convNotFoundLead",
              "Ce parcours n’existe plus ou n’est plus lié à ton compte. Refais le questionnaire pour générer un nouveau parcours."
            )}
          </p>
          <div className="chatbot-recovery-actions">
            <Link to="/demo" className="lp-btn lp-btn-primary">
              {tc("convNotFoundCtaQuiz", "Refaire le questionnaire")}
            </Link>
            <Link to="/choice" className="nav-btn secondary">
              {tc("convNotFoundCtaChoice", "Retour au menu")}
            </Link>
          </div>
        </section>
      ) : null}

      {convLoadState === "error" ? (
        <section className="panel chatbot-recovery" role="alert">
          <h2 className="chatbot-recovery-title">{tc("loadErrorTitle", "Impossible de charger le parcours")}</h2>
          <p className="chatbot-recovery-lead">{error}</p>
          <div className="chatbot-recovery-actions">
            <button
              type="button"
              className="lp-btn lp-btn-primary"
              onClick={() => {
                setConvLoadState("loading");
                setError("");
                apiGet(`/api/conversations/${cid}`)
                  .then((c) => {
                    setConv(c);
                    const msgs = c.messages || [];
                    syncCoachUsageFromHistory(msgs);
                    setHistory(msgs);
                    setRawRecs(c.initial_recommendations || []);
                    setConvLoadState("ready");
                  })
                  .catch((e) => {
                    if (isConversationNotFoundMessage(e.message)) handleConversationMissing();
                    else {
                      setConvLoadState("error");
                      setError(humanizeApiErrorMessage(e.message, convNotFoundFallback));
                    }
                  });
              }}
            >
              {tc("loadErrorRetry", "Réessayer")}
            </button>
            <Link to="/demo" className="nav-btn secondary">
              {tc("convNotFoundCtaQuiz", "Refaire le questionnaire")}
            </Link>
          </div>
        </section>
      ) : null}

      {convLoadState === "ready" ? (
      <>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <span className="eyebrow">{tc("eyebrow", "Assistant orientation")}</span>
        <h1>{tc("title", "Moov'Coach")}</h1>
        <p>{tc("heroLead", "Pose tes questions sur les métiers et formations recommandées pour ton profil.")}</p>
        <div className="chatbot-hero-actions">
          <button type="button" className="nav-btn secondary chatbot-hero-path" onClick={() => setPathwayOpen(true)}>
            {tc("viewMyPath", "Voir mon parcours")}
          </button>
          <Link to="/cvlm" className="nav-btn secondary">{tc("cvLmLink", "CV & LM")}</Link>
          <button type="button" className="nav-btn primary" onClick={sharePathway}>
            {shareCopied ? tc("linkCopied", "Lien copié") : tc("sharePath", "Partager mon parcours")}
          </button>
        </div>
      </section>

      {(legacyStubDetected || devApiMissingOpenRouter) ? (
        <div className="chatbot-health-banner" role="status">
          <ReactMarkdown>
            {(
              legacyStubDetected
                ? t("coach", "legacyCoachBanner", "")
                : t("coach", "devApiNoOpenRouterBanner", "")
            ).trim()}
          </ReactMarkdown>
        </div>
      ) : null}

      {cid ? (
        <div
          className={`chatbot-quota-banner${coachQuota.isUnlimited ? " chatbot-quota-banner--premium" : ""}${!coachQuota.isUnlimited && coachQuota.blocked ? " chatbot-quota-banner--blocked" : ""}`}
        >
          <ReactMarkdown>
            {coachQuota.isUnlimited
              ? tc(
                  "quotaBannerPremium",
                  "Tu es en **Premium B2C** : messages Moov’Coach illimités (dans cette démo)."
                )
              : tc(
                  "quotaBanner",
                  "Offre gratuite : il te reste **{remaining}** message(s) Moov’Coach sur **{limit}** inclus."
                )
                  .replace(/\{remaining\}/g, String(coachQuota.remaining))
                  .replace(/\{limit\}/g, String(coachQuota.limit))}
          </ReactMarkdown>
          {!coachQuota.isUnlimited && coachQuota.blocked ? (
            <Link to="/partenaires/offres" className="lp-btn lp-btn-primary lp-btn-sm chatbot-quota-cta">
              {tc("quotaUpgradeCta", "Voir les offres et passer en Premium")}
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="chatbot-grid">
        <aside className="chatbot-aside" aria-label={tc("recJobsAsideAria", "Métiers recommandés")}>
          <div className="chatbot-aside-head">
            <h3>{tc("asideJobsTitle", "Métiers recommandés")}</h3>
            <span className="chatbot-aside-count">{recs.length}</span>
            {localizingRecs ? (
              <span className="chatbot-aside-localizing">{tc("localizingJobs", "Translating…")}</span>
            ) : null}
          </div>
          <div className="chatbot-aside-list">
            {recs.map((hit, i) => (
              <article key={i} className="chatbot-rec chatbot-rec-interactive">
                <h4 className="chatbot-rec-title">{hit.metier?.libelle}</h4>
                {hit.metier?.description ? (
                  <p className="chatbot-rec-desc">{hit.metier.description.slice(0, 140)}…</p>
                ) : null}
                {hit.formations?.length > 0 ? (
                  <RecommendedFormationsList
                    formations={hit.formations}
                    t={tc}
                    onAskFormation={(f) => focusComposerForFormation(hit.metier?.libelle, f)}
                  />
                ) : null}
                {hit.metier?.lien_onisep ? (
                  <a
                    href={hit.metier.lien_onisep}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chatbot-rec-onisep-subtle"
                  >
                    {tc("onisepSheetSecondary", "Fiche métier ONISEP (externe)")}
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </aside>

        <section className="chatbot-chat" aria-label={tc("chatSectionAria", "Conversation")}>
          <div className="chatbot-chat-head">
            <h3>{tc("chatHead", "Conversation avec Moov'Coach")}</h3>
            <span className="chatbot-chat-head-hint">{tc("chatHeadHint", "Pose une question ci-dessous. Ouvre « Voir mon parcours » pour le résumé complet.")}</span>
          </div>

          <div className="chatbot-stream" ref={scrollRef}>
            {greeting && <div className="chatbot-greeting">{greeting}</div>}
            {history.map((m, i) => (
              <MessageBubble
                key={i}
                role={m.role}
                content={m.content}
                userInitial={userInitial}
                youTitle={youTitleStr}
                coachTitle={coachTitleStr}
              />
            ))}
            {sending && <TypingIndicator typingAria={typingAriaStr} coachTitle={coachTitleStr} />}
          </div>

          {error && <div className="chatbot-error" role="alert">{error}</div>}

          <form onSubmit={send} className="chatbot-composer">
            <div className={`chatbot-composer-pill${sending ? " is-sending" : ""}`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={tc("placeholder", "Pose ta question à Moov'Coach…")}
                rows={1}
                disabled={sending || (!coachQuota.isUnlimited && coachQuota.blocked)}
                aria-label={tc("yourMessageAria", "Ton message")}
              />
              <button
                type="submit"
                className="chatbot-send-icon"
                disabled={sending || !input.trim() || (!coachQuota.isUnlimited && coachQuota.blocked)}
                aria-label={tc("sendAria", "Envoyer le message")}
                title={tc("sendTitle", "Envoyer (Entrée)")}
              >
                {sending ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
                    </path>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10.2 16 12 3.4 13.8z" fill="currentColor" />
                  </svg>
                )}
              </button>
            </div>
            <p className="chatbot-hint">{tc("composerHint", "Entrée pour envoyer · Shift+Entrée pour aller à la ligne")}</p>
          </form>
        </section>
      </div>

      <PathwaySummaryModal
        open={pathwayOpen}
        onClose={() => setPathwayOpen(false)}
        profileText={conv?.profile_text || ""}
        recommendations={recs}
        quizAnswers={conv?.quiz_answers}
        niveauMax={typeof conv?.niveau_max === "number" ? conv.niveau_max : undefined}
      />
      </>
      ) : null}
    </div>
  );
}
