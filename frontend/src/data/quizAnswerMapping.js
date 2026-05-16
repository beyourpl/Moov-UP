/** Mappe les réponses UI (nouveau questionnaire) vers les clés attendues par l’API / profile_builder. */

export function normalizeQuizAnswer(value) {
  return value ? String(value).split("__")[0] : value;
}

/**
 * UI q1 domaine · q2 priorité pro · q3 lieu travail · q4 apprentissage · q5 logique
 * · q6 rythme études · q7 encadrement · q8 niveau · q9 mobilité · q10 freins
 */
export function mapUiQuizAnswersToBackend(ui) {
  const n = normalizeQuizAnswer;
  return {
    q1: n(ui.q1),
    q2: n(ui.q4),
    q3: n(ui.q8),
    q4: n(ui.q10),
    q5: n(ui.q3),
    q6: n(ui.q6),
    q7: n(ui.q7),
    q8: n(ui.q5),
    q9: n(ui.q2),
    q10: n(ui.q9),
  };
}
