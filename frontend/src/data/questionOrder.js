/** Ordre fixe des 10 questions principales. */
export const BASE_QUESTION_ORDER = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"];

const QSPEC_DOMAIN_KEYS = new Set(["creative", "communication"]);

/** Ordre effectif du questionnaire (spécialité insérée après certains domaines). */
export function getQuestionOrder(answers = {}) {
  const order = ["q1"];
  if (QSPEC_DOMAIN_KEYS.has(answers.q1)) order.push("qSpec");
  return [...order, ...BASE_QUESTION_ORDER.slice(1)];
}

/** @deprecated Utiliser getQuestionOrder(answers) */
export const QUESTION_ORDER = BASE_QUESTION_ORDER;
