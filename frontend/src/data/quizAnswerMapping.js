/** Mappe les réponses UI (nouveau questionnaire) vers les clés attendues par l’API / profile_builder. */

export function normalizeQuizAnswer(value) {
  return value ? String(value).split("__")[0] : value;
}

/** Spécialité explicite (qSpec) ou déduite du domaine / activité naturelle. */
export function inferQuizSpecialty(ui) {
  const n = normalizeQuizAnswer;
  const explicit = n(ui.qSpec);
  if (explicit) return explicit;
  const q1 = n(ui.q1);
  const activity = n(ui.q2);
  if (q1 === "communication") return "journalisme";
  if (activity === "ecrire-raconter" && (q1 === "creative" || q1 === "communication")) {
    return "journalisme";
  }
  return null;
}

/**
 * UI q1 domaine · q2 activité · q3 lieu · q4 apprentissage · q5 logique
 * · q6 rythme · q7 encadrement · q8 niveau · q9 mobilité · q10 freins
 */
export function mapUiQuizAnswersToBackend(ui) {
  const n = normalizeQuizAnswer;
  const specialty = inferQuizSpecialty(ui);
  return {
    q1: n(ui.q1),
    activity: n(ui.q2),
    q2: n(ui.q4),
    q3: n(ui.q8),
    q4: n(ui.q10),
    q5: n(ui.q3),
    q6: n(ui.q6),
    q7: n(ui.q7),
    q8: n(ui.q5),
    q10: n(ui.q9),
    ...(specialty ? { specialty } : {}),
  };
}
