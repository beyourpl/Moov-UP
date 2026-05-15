import { useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { TopBarAccountTools } from "./TopBarAccountTools.jsx";
import { logoutUser } from "../data/authStorage.js";
import { getText } from "../data/translations.js";
import { useUiPreferences } from "../hooks/useUiPreferences.js";
import { useNavigateBack } from "../hooks/useNavigateBack.js";
import { getPartenairesOffer } from "../data/partenairesSession.js";
import { getCvLmQuotaState, recordCvLmAnalysisConsumed } from "../data/usageQuota.js";

/** CV: critères alignés sur ce que les ATS extraient et filtrent le plus souvent */
const CV_CRITERIA_DEF = [
  { id: "keywords", labelKey: "critAtsKeywords", weight: 2 },
  { id: "sections", labelKey: "critAtsSections", weight: 1.5 },
  { id: "chronology", labelKey: "critAtsChronology", weight: 1.5 },
  { id: "quantified", labelKey: "critAtsQuantified", weight: 1.5 },
  { id: "skills", labelKey: "critAtsSkills", weight: 1.5 },
  { id: "parsing", labelKey: "critAtsParsing", weight: 2 },
  { id: "length", labelKey: "critAtsLength", weight: 1 },
];

/** LM: critères pour lettres souvent jointes au dossier ou lues après parsing CV */
const LM_CRITERIA_DEF = [
  { id: "keywords", labelKey: "critAtsLmKeywords", weight: 2 },
  { id: "hook", labelKey: "critAtsLmHook", weight: 1.5 },
  { id: "structure", labelKey: "critAtsLmStructure", weight: 1.5 },
  { id: "proofs", labelKey: "critAtsLmProofs", weight: 1.5 },
  { id: "clarity", labelKey: "critAtsLmClarity", weight: 1.5 },
  { id: "length", labelKey: "critAtsLmLength", weight: 1 },
];

/** French fallbacks for `t()` when a locale has no `cvlm` entry yet */
const FR_CVLM_CRIT = {
  critAtsKeywords: "Mots-clés et lexique métier (ATS)",
  critAtsSections: "Titres de sections normalisés",
  critAtsChronology: "Dates et ordre chronologique",
  critAtsQuantified: "Réalisations quantifiées",
  critAtsSkills: "Bloc compétences exploitable par parsing",
  critAtsParsing: "Lisibilité machine (PDF, mise en page)",
  critAtsLength: "Densité / longueur (cible 1–2 pages)",
  critAtsLmKeywords: "Alignement avec l’offre (mots-clés)",
  critAtsLmHook: "Accroche et lien avec le poste",
  critAtsLmStructure: "Objet, formules et paragraphes",
  critAtsLmProofs: "Exemples et faits vérifiables",
  critAtsLmClarity: "Clarté, ton professionnel",
  critAtsLmLength: "Concision (cible une page)",
};

const FR_CVLM_SUG = {
  sugAtsKeywords:
    "Alignez intitulés, outils et compétences sur le vocabulaire des fiches de poste ; évitez les formulations trop vagues pour passer les filtres de correspondance.",
  sugAtsSections:
    "Utilisez des intitulés standards (Formation, Expérience, Compétences, Langues) : les ATS segmentent souvent le CV sur ces balises.",
  sugAtsChronology:
    "Précisez mois/année et un ordre cohérent (souvent du plus récent au plus ancien) pour une chronologie exploitable automatiquement.",
  sugAtsQuantified:
    "Ajoutez des chiffres (%, volumes, délais, budgets) : les moteurs de scoring et les recruteurs s’appuient sur des indicateurs concrets.",
  sugAtsSkills:
    "Liste courte de compétences et synonymes métier (ex. CRM / gestion de la relation client) pour maximiser les correspondances lexicales.",
  sugAtsParsing:
    "Privilégiez un PDF avec texte sélectionnable, une colonne simple et peu d’éléments en image : le texte doit être extractible sans erreur.",
  sugAtsLength:
    "Visez 1 à 2 pages : au-delà, le risque est une perte de mots-clés en tête de document ou un abandon humain après l’aperçu ATS.",
  sugAtsLmKeywords:
    "Reprenez des termes ou exigences de l’annonce (sans bourrage) pour rester cohérent avec le profil parsé du CV.",
  sugAtsLmHook:
    "Ouvrez par le poste visé et une phrase sur ce que vous apportez sur ce rôle précis — les lecteurs et outils repèrent vite les lettres génériques.",
  sugAtsLmStructure:
    "Respectez objet, salutation, 2–3 paragraphes, formule de politesse : une structure régulière facilite lecture humaine et extraction.",
  sugAtsLmProofs:
    "Illustrez avec un fait, un projet ou un résultat mesurable plutôt qu’avec des qualificatifs seuls.",
  sugAtsLmClarity:
    "Phrases courtes, aucune faute évidente, acronymes développés une première fois : la clarté limite l’écart avec le profil ATS du CV.",
  sugAtsLmLength:
    "Tenez une page A4 : les lettres longues sont souvent tronquées ou non lues en entier après le CV dans les outils de recrutement.",
};

function hashString(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return Math.abs(h);
}

function criterionScore(seed, criterionId) {
  const h = hashString(`${seed}|${criterionId}`);
  return 52 + (h % 44);
}

function simulateAIAnalysis(type, fileName, criteria) {
  const seed = `${type}:${fileName}`;
  const scores = {};
  criteria.forEach((criterion) => {
    scores[criterion.id] = criterionScore(seed, criterion.id);
  });

  const rules =
    type === "cv"
      ? [
          { id: "keywords", below: 74, suggestion: { type: "warning", key: "sugAtsKeywords" } },
          { id: "sections", below: 72, suggestion: { type: "info", key: "sugAtsSections" } },
          { id: "chronology", below: 72, suggestion: { type: "info", key: "sugAtsChronology" } },
          { id: "quantified", below: 73, suggestion: { type: "tip", key: "sugAtsQuantified" } },
          { id: "skills", below: 73, suggestion: { type: "tip", key: "sugAtsSkills" } },
          { id: "parsing", below: 71, suggestion: { type: "warning", key: "sugAtsParsing" } },
          { id: "length", below: 75, suggestion: { type: "warning", key: "sugAtsLength" } },
        ]
      : [
          { id: "keywords", below: 73, suggestion: { type: "warning", key: "sugAtsLmKeywords" } },
          { id: "hook", below: 72, suggestion: { type: "tip", key: "sugAtsLmHook" } },
          { id: "structure", below: 72, suggestion: { type: "info", key: "sugAtsLmStructure" } },
          { id: "proofs", below: 73, suggestion: { type: "tip", key: "sugAtsLmProofs" } },
          { id: "clarity", below: 74, suggestion: { type: "error", key: "sugAtsLmClarity" } },
          { id: "length", below: 76, suggestion: { type: "info", key: "sugAtsLmLength" } },
        ];

  const suggestions = rules
    .filter((r) => scores[r.id] < r.below)
    .sort((a, b) => scores[a.id] - scores[b.id])
    .slice(0, 5)
    .map((r) => r.suggestion);

  const overallScore = Math.round(
    Object.entries(scores).reduce((sum, [key, value]) => {
      const weight = criteria.find((c) => c.id === key)?.weight || 1;
      return sum + value * weight;
    }, 0) / criteria.reduce((sum, c) => sum + c.weight, 0)
  );

  return {
    fileName,
    type,
    scores,
    overallScore,
    suggestions,
    analyzedAt: new Date().toISOString(),
  };
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const CV_TEMPLATE_FR = `MOOV'UP — MODÈLE DE CV (STRUCTURE)
Remplace les lignes par tes informations.

IDENTITÉ
Nom Prénom · Téléphone · Email · Ville · LinkedIn (optionnel)

OBJECTIF (2 lignes max.)
Le poste ou le domaine visé, en une phrase claire.

FORMATION
Année — Diplôme, établissement (lieu)
Mentionner filière, spécialités pertinentes.

EXPÉRIENCES
Année — Intitulé, organisation (lieu)
• Mission concrète + résultat chiffré si possible
• Outils ou méthodes utilisés

COMPÉTENCES
Techniques : …
Langues : …
Logiciels : …

CENTRES D’INTÉRÊT (optionnel, court)
`;

const CV_TEMPLATE_EN = `MOOV'UP — CV TEMPLATE (STRUCTURE)
Replace the placeholder lines with your information.

CONTACT
First Last · Phone · Email · City · LinkedIn (optional)

OBJECTIVE (max 2 lines)
Target role or field in one clear sentence.

EDUCATION
Year — Degree, school (location)
Track or relevant majors.

EXPERIENCE
Year — Title, organization (location)
• Concrete responsibility + measurable outcome if possible
• Tools or methods used

SKILLS
Technical: …
Languages: …
Software: …

INTERESTS (optional, keep short)
`;

const LM_TEMPLATE_FR = `MOOV'UP — MODÈLE DE LETTRE DE MOTIVATION

Coordonnées (à droite ou en en-tête)
À l’attention de …
Objet : Candidature — [intitulé du poste ou formation]

Madame, Monsieur,

Paragraphe 1 — Pourquoi cette structure / formation / poste te correspond (lien avec ton parcours).

Paragraphe 2 — Ce que tu apportes : compétences, expériences, projet professionnel (exemples concrets).

Paragraphe 3 — Disponibilité pour un entretien, remerciements.

Cordialement,
Prénom Nom
`;

const LM_TEMPLATE_EN = `MOOV'UP — COVER LETTER TEMPLATE

Contact block (right or header)
Recipient line
Subject: Application — [role or program title]

Dear Hiring Manager,

Paragraph 1 — Why this organization or program fits your background.

Paragraph 2 — What you offer: skills, experience, career goals (concrete examples).

Paragraph 3 — Availability for an interview / next steps. Thank you.

Sincerely,
First Last
`;

export default function CvLmUploader() {
  const navigate = useNavigate();
  const goBackPage = useNavigateBack("/choice");
  const { language } = useUiPreferences();
  const tCommon = (key, fallback) => getText(language, "common", key, fallback);
  const [cvFile, setCvFile] = useState(null);
  const [lmFile, setLmFile] = useState(null);
  const [cvAnalysis, setCvAnalysis] = useState(null);
  const [lmAnalysis, setLmAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(null);
  const [cvQuotaErr, setCvQuotaErr] = useState("");
  const [lmQuotaErr, setLmQuotaErr] = useState("");

  const t = useCallback((section, key, fallback) => getText(language, section, key, fallback), [language]);

  const cvCriteria = useMemo(
    () =>
      CV_CRITERIA_DEF.map((d) => ({
        id: d.id,
        weight: d.weight,
        label: t("cvlm", d.labelKey, FR_CVLM_CRIT[d.labelKey]),
      })),
    [t]
  );

  const lmCriteria = useMemo(
    () =>
      LM_CRITERIA_DEF.map((d) => ({
        id: d.id,
        weight: d.weight,
        label: t("cvlm", d.labelKey, FR_CVLM_CRIT[d.labelKey]),
      })),
    [t]
  );

  const templates = useMemo(() => {
    const isFr = language === "fr";
    return {
      cv: isFr ? CV_TEMPLATE_FR : CV_TEMPLATE_EN,
      lm: isFr ? LM_TEMPLATE_FR : LM_TEMPLATE_EN,
      cvName: isFr ? "modele-cv-moovup.txt" : "moovup-cv-template.txt",
      lmName: isFr ? "modele-lettre-moovup.txt" : "moovup-cover-letter-template.txt",
    };
  }, [language]);

  const ui = useMemo(
    () => ({
      title: t("cvlm", "title", "Analyse CV & LM"),
      back: t("common", "back", "Retour"),
      home: t("common", "home", "Accueil"),
      cvTitle: t("cvlm", "cvTitle", "CV"),
      lmTitle: t("cvlm", "lmTitle", "Lettre de motivation"),
      uploadCv: t("cvlm", "uploadCv", "Télécharger mon CV"),
      uploadLm: t("cvlm", "uploadLm", "Télécharger ma lettre"),
      analyzing: t("cvlm", "analyzing", "Analyse en cours..."),
      analyze: t("cvlm", "analyze", "Analyser avec l'IA"),
      generateCv: t("cvlm", "generateCv", "Télécharger un modèle de CV (structure)"),
      generateLm: t("cvlm", "generateLm", "Télécharger un modèle de lettre"),
      generateHint: t(
        "cvlm",
        "generateHint",
        "Fichiers texte vierges à compléter, puis importe-les ci-dessous pour analyse."
      ),
      overallScore: t("cvlm", "overallScore", "Score global"),
      suggestions: t("cvlm", "suggestions", "Suggestions d'amélioration"),
      noFile: t("cvlm", "noFile", "Aucun fichier"),
      tip: t("common", "tip", "Conseil"),
      warning: t("common", "warning", "Attention"),
      error: t("common", "error", "Erreur"),
      info: t("common", "info", "Information"),
    }),
    [t]
  );

  const premiumOffer = getPartenairesOffer()?.offer;
  const cvQuota = useMemo(() => getCvLmQuotaState("cv"), [cvAnalysis, analyzing, cvFile, premiumOffer]);
  const lmQuota = useMemo(() => getCvLmQuotaState("lm"), [lmAnalysis, analyzing, lmFile, premiumOffer]);

  const cvQuotaHint = useMemo(() => {
    if (cvQuota.isUnlimited) {
      return t(
        "cvlm",
        "quotaUnlimitedHint",
        "Offre **Premium B2C** : analyses CV / lettre illimitées (démo)."
      );
    }
    const kind = t("cvlm", "quotaKindCv", "CV");
    return t(
      "cvlm",
      "quotaHint",
      "Analyses **{kind}** gratuites restantes : **{remaining}** / **{limit}** (puis passage Premium)."
    )
      .replace(/\{kind\}/g, kind)
      .replace(/\{remaining\}/g, String(cvQuota.remaining))
      .replace(/\{limit\}/g, String(cvQuota.limit));
  }, [cvQuota, t]);

  const lmQuotaHint = useMemo(() => {
    if (lmQuota.isUnlimited) {
      return t(
        "cvlm",
        "quotaUnlimitedHint",
        "Offre **Premium B2C** : analyses CV / lettre illimitées (démo)."
      );
    }
    const kind = t("cvlm", "quotaKindLm", "lettre");
    return t(
      "cvlm",
      "quotaHint",
      "Analyses **{kind}** gratuites restantes : **{remaining}** / **{limit}** (puis passage Premium)."
    )
      .replace(/\{kind\}/g, kind)
      .replace(/\{remaining\}/g, String(lmQuota.remaining))
      .replace(/\{limit\}/g, String(lmQuota.limit));
  }, [lmQuota, t]);

  const handleUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    };

    if (type === "cv") {
      setCvFile(fileData);
      setCvAnalysis(null);
      setCvQuotaErr("");
    } else {
      setLmFile(fileData);
      setLmAnalysis(null);
      setLmQuotaErr("");
    }

    e.target.value = "";
  };

  const handleAnalyze = async (type) => {
    const fileData = type === "cv" ? cvFile : lmFile;
    if (!fileData) return;

    if (type === "cv") setCvQuotaErr("");
    else setLmQuotaErr("");

    const st = getCvLmQuotaState(type);
    if (!st.isUnlimited && st.blocked) {
      const msg = t(
        "cvlm",
        "quotaExceeded",
        "Limite gratuite d’analyses atteinte pour ce document. Passe à Premium pour continuer."
      );
      if (type === "cv") setCvQuotaErr(msg);
      else setLmQuotaErr(msg);
      return;
    }

    setAnalyzing(type);

    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

    const criteria = type === "cv" ? cvCriteria : lmCriteria;
    const analysis = simulateAIAnalysis(type, fileData.name, criteria);

    if (type === "cv") {
      setCvAnalysis(analysis);
    } else {
      setLmAnalysis(analysis);
    }

    recordCvLmAnalysisConsumed(type);

    setAnalyzing(null);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "var(--green)";
    if (score >= 65) return "var(--gold)";
    return "var(--pink)";
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return t("cvlm", "excellent", "Excellent");
    if (score >= 65) return t("cvlm", "good", "Bien");
    return t("cvlm", "improve", "À améliorer");
  };

  const suggestionLine = (suggestion) => {
    if (suggestion.key) {
      return t("cvlm", suggestion.key, FR_CVLM_SUG[suggestion.key] || "");
    }
    return suggestion.text || "";
  };

  const ScoreBar = ({ label, value }) => (
    <div className="score-bar">
      <div className="score-bar-label">
        <span>{label}</span>
        <span style={{ color: getScoreColor(value) }}>{value}%</span>
      </div>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{ width: `${value}%`, background: getScoreColor(value) }}
        />
      </div>
    </div>
  );

  const AnalysisPanel = ({
    analysis,
    type,
    criteria,
    onAnalyze,
    isAnalyzing,
    hasFile,
    quotaHint,
    quotaError,
    quotaBlocked,
  }) => {
    const title = type === "cv" ? ui.cvTitle : ui.lmTitle;

    return (
      <div className="analysis-panel">
        <div className="analysis-header">
          <h4>{title}</h4>
          {analysis && (
            <div className="overall-score">
              <span className="score-label">{ui.overallScore}</span>
              <span className="score-value" style={{ color: getScoreColor(analysis.overallScore) }}>
                {analysis.overallScore}%
              </span>
              <span className="score-text">{getScoreLabel(analysis.overallScore)}</span>
            </div>
          )}
        </div>

        {quotaHint ? (
          <div className="cvlm-quota-hint">
            <ReactMarkdown>{quotaHint}</ReactMarkdown>
          </div>
        ) : null}

        {quotaError ? (
          <div className="cvlm-quota-error" role="alert">
            <p>{quotaError}</p>
            <Link to="/partenaires/offres" className="lp-btn lp-btn-primary lp-btn-sm">
              {t("cvlm", "quotaUpgradeCta", "Voir les offres Premium")}
            </Link>
          </div>
        ) : null}

        {analysis ? (
          <div className="analysis-content">
            <div className="scores-grid">
              {criteria.map((criterion) => (
                <ScoreBar
                  key={criterion.id}
                  label={criterion.label}
                  value={analysis.scores[criterion.id]}
                />
              ))}
            </div>

            {analysis.suggestions.length > 0 && (
              <div className="suggestions-section">
                <h5>{ui.suggestions}</h5>
                <ul className="suggestions-list">
                  {analysis.suggestions.map((suggestion, index) => (
                    <li key={index} className={`suggestion-item ${suggestion.type}`}>
                      <span className={`suggestion-icon ${suggestion.type}`}>
                        {suggestion.type === "tip"
                          ? "💡"
                          : suggestion.type === "warning"
                            ? "⚠️"
                            : suggestion.type === "error"
                              ? "❌"
                              : "ℹ️"}
                      </span>
                      <span>{suggestionLine(suggestion)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              className="lp-btn lp-btn-ghost"
              onClick={() => onAnalyze(type)}
              disabled={!hasFile || isAnalyzing || quotaBlocked}
            >
              {t("cvlm", "reanalyze", "Réanalyser")}
            </button>
          </div>
        ) : (
          <div className="analysis-empty">
            <p>{t("cvlm", "noAnalysis", "Aucun résultat d'analyse")}</p>
            <button
              className="lp-btn lp-btn-primary"
              onClick={() => onAnalyze(type)}
              disabled={isAnalyzing || !hasFile || quotaBlocked}
            >
              {isAnalyzing ? ui.analyzing : ui.analyze}
            </button>
          </div>
        )}
      </div>
    );
  };

  const handleLogout = () => {
    logoutUser();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="cvlm-uploader">
      <div className="cvlm-actions cvlm-actions--with-global-nav">
        <button type="button" className="lp-btn lp-btn-ghost" onClick={goBackPage}>
          ← {ui.back}
        </button>
        <button type="button" className="lp-btn lp-btn-primary" onClick={() => navigate("/")}>
          {ui.home}
        </button>
        <TopBarAccountTools className="cvlm-topbar-tools" />
        <button type="button" className="lp-btn lp-btn-ghost" onClick={handleLogout}>
          {tCommon("logout", "Se déconnecter")}
        </button>
      </div>

      <div className="lp-section-head">
        <p className="lp-section-kicker">{t("cvlm", "kicker", "Outil · IA")}</p>
        <h2 className="lp-title">{ui.title}</h2>
        <p className="lp-sub-strong">
          {t(
            "cvlm",
            "description",
            "Téléchargez vos documents et laissez l'IA les analyser pour vous donner des conseils personnalisés."
          )}
        </p>
      </div>

      <div className="cvlm-generate-panel">
        <p className="cvlm-generate-title">{ui.generateHint}</p>
        <div className="cvlm-generate-actions">
          <button
            type="button"
            className="lp-btn lp-btn-primary"
            onClick={() => downloadTextFile(templates.cvName, templates.cv)}
          >
            {ui.generateCv}
          </button>
          <button
            type="button"
            className="lp-btn lp-btn-ghost"
            onClick={() => downloadTextFile(templates.lmName, templates.lm)}
          >
            {ui.generateLm}
          </button>
        </div>
      </div>

      <div className="upload-sections">
        <div className="upload-section">
          <h3>{ui.cvTitle}</h3>
          <div className="upload-area">
            {cvFile ? (
              <div className="file-info">
                <span className="file-icon">📄</span>
                <span className="file-name">{cvFile.name}</span>
              </div>
            ) : (
              <p className="upload-placeholder">{ui.noFile}</p>
            )}
            <label className="lp-btn lp-btn-ghost upload-btn">
              {ui.uploadCv}
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => handleUpload(e, "cv")}
                style={{ display: "none" }}
              />
            </label>
          </div>
          <AnalysisPanel
            analysis={cvAnalysis}
            type="cv"
            criteria={cvCriteria}
            onAnalyze={handleAnalyze}
            isAnalyzing={analyzing === "cv"}
            hasFile={Boolean(cvFile)}
            quotaHint={cvQuotaHint}
            quotaError={cvQuotaErr}
            quotaBlocked={!cvQuota.isUnlimited && cvQuota.blocked}
          />
        </div>

        <div className="upload-section">
          <h3>{ui.lmTitle}</h3>
          <div className="upload-area">
            {lmFile ? (
              <div className="file-info">
                <span className="file-icon">📝</span>
                <span className="file-name">{lmFile.name}</span>
              </div>
            ) : (
              <p className="upload-placeholder">{ui.noFile}</p>
            )}
            <label className="lp-btn lp-btn-ghost upload-btn">
              {ui.uploadLm}
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => handleUpload(e, "lm")}
                style={{ display: "none" }}
              />
            </label>
          </div>
          <AnalysisPanel
            analysis={lmAnalysis}
            type="lm"
            criteria={lmCriteria}
            onAnalyze={handleAnalyze}
            isAnalyzing={analyzing === "lm"}
            hasFile={Boolean(lmFile)}
            quotaHint={lmQuotaHint}
            quotaError={lmQuotaErr}
            quotaBlocked={!lmQuota.isUnlimited && lmQuota.blocked}
          />
        </div>
      </div>
    </div>
  );
}
