/** Ordre fixe des 10 questions principales. */
export const BASE_QUESTION_ORDER = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"];

/** Spécialité détaillée seulement pour création visuelle (communication = déjà ciblé en Q1). */
const QSPEC_DOMAIN_KEYS = new Set(["creative"]);

/** Ordre effectif : domaine → activité → spécialité éventuelle → suite du questionnaire. */
export function getQuestionOrder(answers = {}) {
  const order = ["q1", "q2"];
  if (QSPEC_DOMAIN_KEYS.has(answers.q1)) order.push("qSpec");
  return [...order, ...BASE_QUESTION_ORDER.slice(2)];
}

/** @deprecated Utiliser getQuestionOrder(answers) */
export const QUESTION_ORDER = BASE_QUESTION_ORDER;
