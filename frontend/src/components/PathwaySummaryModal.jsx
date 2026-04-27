import { useEffect, useId, useRef } from "react";
import {
  buildDiplomaTrajectoryText,
  buildQuizAnswerChips,
  collectFormationLevelsFromRecs,
} from "../data/quizPathwaySummary.js";
import { useTranslation } from "../hooks/useTranslation.js";

function truncate(text, max = 320) {
  if (!text || typeof text !== "string") return "";
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

export default function PathwaySummaryModal({
  open,
  onClose,
  profileText,
  recommendations,
  quizAnswers,
  niveauMax,
}) {
  const { t, language } = useTranslation();
  const titleId = useId();
  const panelRef = useRef(null);
  const quiz = quizAnswers && typeof quizAnswers === "object" ? quizAnswers : {};
  const chips = buildQuizAnswerChips(quiz, language);
  const trajectory = buildDiplomaTrajectoryText(quiz, niveauMax, language);
  const formationLevels = collectFormationLevelsFromRecs(recommendations);
  const list = Array.isArray(recommendations) ? recommendations : [];

  const pt = (key, fallback) => t("pathwaySummary", key, fallback);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(
      () => panelRef.current?.querySelector("button.pathway-modal-close")?.focus(),
      50
    );
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  if (!open) return null;

  return (
    <div className="pathway-modal-root" role="presentation">
      <button
        type="button"
        className="pathway-modal-scrim"
        aria-label={pt("closeScrim", "Fermer la fenêtre parcours")}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="pathway-modal-panel pathway-modal-panel--v2"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pathway-modal-hero">
          <div className="pathway-modal-hero-text">
            <p className="pathway-modal-eyebrow">{pt("eyebrow", "Parcours guidé")}</p>
            <h2 id={titleId} className="pathway-modal-title">
              {pt("title", "Ton parcours diplômes")}
            </h2>
            <p className="pathway-modal-lead">
              {pt(
                "lead",
                "Construit à partir de tes réponses au questionnaire et des niveaux de formations proposés pour ton profil."
              )}
            </p>
          </div>
          <button type="button" className="pathway-modal-close nav-btn secondary" onClick={onClose}>
            {pt("closeBtn", "Fermer")}
          </button>
        </header>

        <div className="pathway-modal-body pathway-modal-body--v2">
          {chips.length > 0 ? (
            <section
              className="pathway-section pathway-section--chips"
              aria-label={pt("sectionChipsAria", "Tes réponses au questionnaire")}
            >
              <div className="pathway-section-head">
                <span className="pathway-section-icon" aria-hidden>✦</span>
                <div>
                  <h3 className="pathway-section-title">{pt("chipsTitle", "Ce que tu as indiqué")}</h3>
                  <p className="pathway-section-sub">
                    {pt(
                      "chipsSub",
                      "Chaque réponse influence le filtre de niveau et les pistes d’études."
                    )}
                  </p>
                </div>
              </div>
              <ul className="pathway-chip-grid">
                {chips.map((c) => (
                  <li key={c.key} className="pathway-chip">
                    <span className="pathway-chip-label">{c.label}</span>
                    <span className="pathway-chip-value">{c.value}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section
            className="pathway-section pathway-section--timeline"
            aria-label={pt("sectionTimelineAria", "Fil d’études")}
          >
            <div className="pathway-section-head">
              <span className="pathway-section-icon" aria-hidden>◇</span>
              <div>
                <h3 className="pathway-section-title">{trajectory.title}</h3>
                <p className="pathway-section-sub">
                  {pt(
                    "timelineSub",
                    "Logique d’études cohérente avec ton niveau scolaire et tes priorités."
                  )}
                </p>
              </div>
            </div>
            <ol className="pathway-timeline">
              {trajectory.lines.map((line, i) => (
                <li key={i} className="pathway-timeline-item">
                  <span className="pathway-timeline-dot" aria-hidden />
                  <p>{line}</p>
                </li>
              ))}
            </ol>
          </section>

          {formationLevels.length > 0 ? (
            <section
              className="pathway-section pathway-section--levels"
              aria-label={pt("sectionLevelsAria", "Niveaux dans les recommandations")}
            >
              <div className="pathway-section-head">
                <span className="pathway-section-icon" aria-hidden>◎</span>
                <div>
                  <h3 className="pathway-section-title">
                    {pt("levelsTitle", "Diplômes repérés dans tes formations suggérées")}
                  </h3>
                  <p className="pathway-section-sub">
                    {pt("levelsSub", "Libellés de niveau issus des fiches formation (ONISEP / base Moov’Up).")}
                  </p>
                </div>
              </div>
              <ul className="pathway-level-pills">
                {formationLevels.map((lvl) => (
                  <li key={lvl} className="pathway-level-pill">{lvl}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {profileText ? (
            <section
              className="pathway-section pathway-section--profile"
              aria-label={pt("sectionProfileAria", "Synthèse textuelle")}
            >
              <div className="pathway-section-head">
                <span className="pathway-section-icon" aria-hidden>≡</span>
                <div>
                  <h3 className="pathway-section-title">{pt("profileTitle", "Synthèse pour l’IA")}</h3>
                  <p className="pathway-section-sub">
                    {pt("profileSub", "Texte construit à partir du questionnaire (même base que Moov’Coach).")}
                  </p>
                </div>
              </div>
              <p className="pathway-profile-block">{profileText}</p>
            </section>
          ) : null}

          {list.length > 0 ? (
            <section
              className="pathway-section pathway-section--metiers"
              aria-label={pt("sectionMetiersAria", "Métiers recommandés")}
            >
              <div className="pathway-section-head">
                <span className="pathway-section-icon" aria-hidden>★</span>
                <div>
                  <h3 className="pathway-section-title">{pt("metiersTitle", "Métiers & accès")}</h3>
                  <p className="pathway-section-sub">
                    {pt(
                      "metiersSub",
                      "Pour chaque métier : niveau d’accès, description courte, formations liées."
                    )}
                  </p>
                </div>
              </div>
              <ol className="pathway-metier-cards">
                {list.map((hit, i) => {
                  const m = hit.metier || {};
                  const formations = Array.isArray(hit.formations) ? hit.formations : [];
                  const salaire =
                    m.salaire_median ||
                    m.salaire ||
                    m.remuneration ||
                    m.fourchette_salaire ||
                    null;
                  const metierFallback = pt("metierFallback", "Métier {n}").replace("{n}", String(i + 1));
                  const formFb = pt("formationFallback", "Formation");
                  return (
                    <li key={i} className="pathway-metier-card">
                      <div className="pathway-metier-card-top">
                        <span className="pathway-metier-rank">{i + 1}</span>
                        <div>
                          <h4 className="pathway-metier-name">{m.libelle || metierFallback}</h4>
                          {m.niveau_min ? (
                            <p className="pathway-metier-access">
                              <span className="pathway-metier-tag">{pt("accessTag", "Accès")}</span> {m.niveau_min}
                            </p>
                          ) : null}
                          {salaire ? (
                            <p className="pathway-metier-salary">
                              {pt("salaryPrefix", "Indication salariale :")} {String(salaire)}
                              <span className="pathway-modal-disclaimer">
                                {" "}
                                {pt("salaryDisclaimer", "(à confirmer sur sources officielles)")}
                              </span>
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {m.description ? <p className="pathway-metier-desc">{truncate(m.description, 360)}</p> : null}
                      {m.lien_onisep || m.lien_canonique ? (
                        <a
                          className="pathway-metier-onisep"
                          href={m.lien_onisep || m.lien_canonique}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {pt("onisepLink", "Fiche ONISEP — salaires & débouchés →")}
                        </a>
                      ) : null}
                      {formations.length > 0 ? (
                        <ul className="pathway-metier-form-list">
                          {formations.map((f, j) => (
                            <li key={j}>
                              {f.lien ? (
                                <a href={f.lien} target="_blank" rel="noopener noreferrer">
                                  {f.libelle || formFb}
                                </a>
                              ) : (
                                <span>{f.libelle || formFb}</span>
                              )}
                              <span className="pathway-metier-form-meta">
                                {f.niveau_label ? ` · ${f.niveau_label}` : ""}
                                {f.duree ? ` · ${f.duree}` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : (
            <p className="pathway-modal-empty">
              {pt(
                "emptyState",
                "Aucune recommandation métier pour l’instant — continue la discussion ou refais le questionnaire."
              )}
            </p>
          )}

          <p className="pathway-modal-footnote pathway-modal-footnote--v2">
            {pt(
              "footnote",
              "Les salaires et débouchés varient selon le secteur et l’expérience : croise toujours avec les fiches ONISEP et les réponses de Moov’Coach."
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
