import { getPathwayTrajectoryBundle } from "./pathwayTrajectory.js";
import { getQuizChoiceText, getText } from "./translations.js";
import { getSpecialtyChoiceText } from "./specialtyLabels.js";

function normDomain(q1) {
  if (!q1 || typeof q1 !== "string") return "";
  return q1.split("__")[0].trim();
}

function q4Label(domain, q4, language) {
  if (!q4 || !domain) return null;
  const pack = getSpecialtyChoiceText(language, domain, q4, {});
  return pack?.title || q4;
}

function choiceTitle(language, questionId, value) {
  if (!value) return "";
  const pack = getQuizChoiceText(language, questionId, value, {});
  return pack?.title || value;
}

/**
 * Puces « ce que tu as répondu » pour la modale parcours.
 * @param {Record<string, string | undefined>} quiz
 * @param {string} language
 */
export function buildQuizAnswerChips(quiz, language = "fr") {
  if (!quiz || typeof quiz !== "object") return [];
  const d = normDomain(quiz.q1);
  const L = (key, fb) => getText(language, "pathwaySummary", key, fb);
  const chips = [];
  const q1t = choiceTitle(language, "q1", d);
  if (q1t) chips.push({ key: "q1", label: L("chipDomain", "Domaine"), value: q1t });
  if (quiz.q2) {
    const v = choiceTitle(language, "q2", quiz.q2);
    if (v) chips.push({ key: "q2", label: L("chipLearning", "Apprentissage"), value: v });
  }
  if (quiz.q3) {
    const v = choiceTitle(language, "q3", quiz.q3);
    if (v) chips.push({ key: "q3", label: L("chipCurrentLevel", "Niveau actuel"), value: v });
  }
  const sp = q4Label(d, quiz.q4, language);
  if (sp) chips.push({ key: "q4", label: L("chipSpecialty", "Spécialité"), value: sp });
  if (quiz.q5) {
    const v = choiceTitle(language, "q5", quiz.q5);
    if (v) chips.push({ key: "q5", label: L("chipTargetFrame", "Cadre visé"), value: v });
  }
  if (quiz.q6) {
    const v = choiceTitle(language, "q6", quiz.q6);
    if (v) chips.push({ key: "q6", label: L("chipStudyPace", "Rythme d’études"), value: v });
  }
  if (quiz.q7) {
    const v = choiceTitle(language, "q7", quiz.q7);
    if (v) chips.push({ key: "q7", label: L("chipSupport", "Encadrement"), value: v });
  }
  if (quiz.q8) {
    const v = choiceTitle(language, "q8", quiz.q8);
    if (v) chips.push({ key: "q8", label: L("chipNumbers", "Chiffres & logique"), value: v });
  }
  if (quiz.q9) {
    const v = choiceTitle(language, "q9", quiz.q9);
    if (v) chips.push({ key: "q9", label: L("chipCareerGoal", "Objectif pro"), value: v });
  }
  if (quiz.q10) {
    const v = choiceTitle(language, "q10", quiz.q10);
    if (v) chips.push({ key: "q10", label: L("chipMobility", "Mobilité"), value: v });
  }
  return chips;
}

/**
 * Étapes de texte pour le « fil » diplômes lié aux réponses (surtout Q3, Q6, Q9).
 * @param {string} [language]
 */
export function buildDiplomaTrajectoryText(quiz, niveauMax, language = "fr") {
  const traj = getPathwayTrajectoryBundle(language);
  const q3 = quiz?.q3;
  const base = (q3 && traj.q3[q3]) || traj.fallback;
  const ceiling = typeof niveauMax === "number" ? traj.niveauCeiling[niveauMax] : null;
  const filterLine = ceiling ? traj.filterLine.replace("{ceiling}", ceiling) : null;
  const extra = [];
  if (quiz?.q9 === "insertion") extra.push(traj.extraQ9Insertion);
  if (quiz?.q9 === "expertise") extra.push(traj.extraQ9Expertise);
  if (quiz?.q6 === "autonome") extra.push(traj.extraQ6Autonome);
  if (quiz?.q6 === "encadre") extra.push(traj.extraQ6Encadre);
  return {
    title: base.title,
    lines: [...base.lines, ...extra, ...(filterLine ? [filterLine] : [])],
  };
}

/** Niveaux de diplômes distincts extraits des recommandations (libellés ONISEP). */
export function collectFormationLevelsFromRecs(recommendations) {
  const set = new Set();
  const list = Array.isArray(recommendations) ? recommendations : [];
  for (const hit of list) {
    const formations = Array.isArray(hit.formations) ? hit.formations : [];
    for (const f of formations) {
      const label = f.niveau_label || f.libelle;
      if (label) set.add(String(label).trim());
    }
  }
  return [...set];
}
