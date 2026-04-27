import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TopBarAccountTools } from "./TopBarAccountTools.jsx";
import { logoutUser } from "../data/authStorage.js";
import { getText } from "../data/translations.js";
import { useUiPreferences } from "../hooks/useUiPreferences.js";

const LS_CV_META = "moovup_cv_upload_meta";
const LS_LM_META = "moovup_lm_upload_meta";
const LS_CV_ANALYSIS = "moovup_cv_analysis";
const LS_LM_ANALYSIS = "moovup_lm_analysis";

const CV_CRITERIA_DEF = [
  { id: "contact", labelKey: "critCvContact", weight: 1 },
  { id: "experience", labelKey: "critCvExperience", weight: 2 },
  { id: "formation", labelKey: "critCvFormation", weight: 2 },
  { id: "skills", labelKey: "critCvSkills", weight: 1.5 },
  { id: "softskills", labelKey: "critCvSoftskills", weight: 1 },
  { id: "length", labelKey: "critCvLength", weight: 1 },
  { id: "format", labelKey: "critCvFormat", weight: 0.5 },
];

const LM_CRITERIA_DEF = [
  { id: "personalization", labelKey: "critLmPersonalization", weight: 2 },
  { id: "structure", labelKey: "critLmStructure", weight: 1.5 },
  { id: "motivation", labelKey: "critLmMotivation", weight: 2 },
  { id: "grammar", labelKey: "critLmGrammar", weight: 1.5 },
  { id: "length", labelKey: "critLmLength", weight: 1 },
  { id: "impact", labelKey: "critLmImpact", weight: 1 },
];

/** French fallbacks for `t()` when a locale has no `cvlm` entry yet */
const FR_CVLM_CRIT = {
  critCvContact: "Informations de contact",
  critCvExperience: "Expériences professionnelles",
  critCvFormation: "Formation et diplômes",
  critCvSkills: "Compétences techniques",
  critCvSoftskills: "Soft skills",
  critCvLength: "Longueur et concision",
  critCvFormat: "Mise en forme",
  critLmPersonalization: "Personnalisation",
  critLmStructure: "Structure et logique",
  critLmMotivation: "Clarté de la motivation",
  critLmGrammar: "Orthographe et grammaire",
  critLmLength: "Longueur appropriée",
  critLmImpact: "Impact des formulations",
};

const FR_CVLM_SUG = {
  sugCvContact: "Vérifiez que vos coordonnées sont complètes et à jour.",
  sugCvExperience: "Décrivez plus en détail vos missions et responsabilités.",
  sugCvSkills: "Ajoutez des compétences techniques spécifiques à votre domaine.",
  sugCvSoftskills: "Mentionnez des soft skills pertinents (travail en équipe, adaptabilité...).",
  sugCvLength: "Votre CV semble trop long. Visez 1 à 2 pages maximum.",
  sugLmPersonalization: "Personnalisez votre lettre pour chaque candidature.",
  sugLmMotivation: "Expliquez plus clairement pourquoi cette entreprise vous attire.",
  sugLmStructure: "Structurez votre lettre en paragraphes clairs.",
  sugLmGrammar: "Relisez-vous attentivement ou utilisez un correcteur.",
};

function simulateAIAnalysis(type, fileName, criteria) {
  const scores = {};
  const suggestions = [];

  criteria.forEach((criterion) => {
    const baseScore = 60 + Math.random() * 35;
    scores[criterion.id] = Math.round(baseScore);
  });

  if (type === "cv") {
    if (scores.contact < 80) suggestions.push({ type: "warning", key: "sugCvContact" });
    if (scores.experience < 70) suggestions.push({ type: "info", key: "sugCvExperience" });
    if (scores.skills < 70) suggestions.push({ type: "tip", key: "sugCvSkills" });
    if (scores.softskills < 65) suggestions.push({ type: "tip", key: "sugCvSoftskills" });
    if (scores.length > 85) suggestions.push({ type: "warning", key: "sugCvLength" });
  } else {
    if (scores.personalization < 70) suggestions.push({ type: "warning", key: "sugLmPersonalization" });
    if (scores.motivation < 75) suggestions.push({ type: "tip", key: "sugLmMotivation" });
    if (scores.structure < 70) suggestions.push({ type: "info", key: "sugLmStructure" });
    if (scores.grammar < 80) suggestions.push({ type: "error", key: "sugLmGrammar" });
  }

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
  const { language } = useUiPreferences();
  const tCommon = (key, fallback) => getText(language, "common", key, fallback);
  const [cvFile, setCvFile] = useState(null);
  const [lmFile, setLmFile] = useState(null);
  const [cvAnalysis, setCvAnalysis] = useState(null);
  const [lmAnalysis, setLmAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(null);

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

  useEffect(() => {
    try {
      const cvRaw = localStorage.getItem(LS_CV_META) || localStorage.getItem("cv");
      if (cvRaw) setCvFile(JSON.parse(cvRaw));
      const lmRaw = localStorage.getItem(LS_LM_META) || localStorage.getItem("lm");
      if (lmRaw) setLmFile(JSON.parse(lmRaw));
      const cvARaw = localStorage.getItem(LS_CV_ANALYSIS) || localStorage.getItem("cv_analysis");
      if (cvARaw) setCvAnalysis(JSON.parse(cvARaw));
      const lmARaw = localStorage.getItem(LS_LM_ANALYSIS) || localStorage.getItem("lm_analysis");
      if (lmARaw) setLmAnalysis(JSON.parse(lmARaw));
    } catch {
      /* ignore corrupted storage */
    }
  }, []);

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
      localStorage.removeItem(LS_CV_ANALYSIS);
      localStorage.removeItem("cv_analysis");
    } else {
      setLmFile(fileData);
      setLmAnalysis(null);
      localStorage.removeItem(LS_LM_ANALYSIS);
      localStorage.removeItem("lm_analysis");
    }

    const key = type === "cv" ? LS_CV_META : LS_LM_META;
    localStorage.setItem(key, JSON.stringify(fileData));
    try {
      localStorage.removeItem(type === "cv" ? "cv" : "lm");
    } catch {
      /* ignore */
    }
    e.target.value = "";
  };

  const handleAnalyze = async (type) => {
    const fileData = type === "cv" ? cvFile : lmFile;
    if (!fileData) return;

    setAnalyzing(type);

    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

    const criteria = type === "cv" ? cvCriteria : lmCriteria;
    const analysis = simulateAIAnalysis(type, fileData.name, criteria);

    if (type === "cv") {
      setCvAnalysis(analysis);
    } else {
      setLmAnalysis(analysis);
    }

    setAnalyzing(null);
    const aKey = type === "cv" ? LS_CV_ANALYSIS : LS_LM_ANALYSIS;
    localStorage.setItem(aKey, JSON.stringify(analysis));
    try {
      localStorage.removeItem(`${type}_analysis`);
    } catch {
      /* ignore */
    }
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

  const AnalysisPanel = ({ analysis, type, criteria, onAnalyze, isAnalyzing, hasFile }) => {
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
              disabled={!hasFile || isAnalyzing}
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
              disabled={isAnalyzing || !hasFile}
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
        <button type="button" className="lp-btn lp-btn-ghost" onClick={() => navigate(-1)}>
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
          />
        </div>
      </div>
    </div>
  );
}
