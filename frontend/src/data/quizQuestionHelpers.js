/** Ordre des activités Q2 selon le domaine Q1 (les plus pertinentes en premier). */
const Q2_ACTIVITY_ORDER_BY_Q1 = {
  tech: ["resoudre-tech", "analyser-comprendre", "organiser-gerer", "creer-projets", "creer-visuels", "parler-convaincre", "ecrire-raconter", "aider-accompagner"],
  business: ["organiser-gerer", "parler-convaincre", "creer-projets", "analyser-comprendre", "resoudre-tech", "aider-accompagner", "ecrire-raconter", "creer-visuels"],
  communication: ["ecrire-raconter", "parler-convaincre", "creer-visuels", "analyser-comprendre", "organiser-gerer", "creer-projets", "aider-accompagner", "resoudre-tech"],
  creative: ["creer-visuels", "ecrire-raconter", "creer-projets", "parler-convaincre", "analyser-comprendre", "organiser-gerer", "aider-accompagner", "resoudre-tech"],
  sante: ["aider-accompagner", "analyser-comprendre", "organiser-gerer", "parler-convaincre", "ecrire-raconter", "creer-projets", "resoudre-tech", "creer-visuels"],
  education: ["aider-accompagner", "ecrire-raconter", "parler-convaincre", "organiser-gerer", "analyser-comprendre", "creer-projets", "creer-visuels", "resoudre-tech"],
  droit: ["analyser-comprendre", "parler-convaincre", "ecrire-raconter", "organiser-gerer", "aider-accompagner", "creer-projets", "resoudre-tech", "creer-visuels"],
  industrie: ["resoudre-tech", "organiser-gerer", "analyser-comprendre", "creer-projets", "creer-visuels", "aider-accompagner", "parler-convaincre", "ecrire-raconter"],
  batiment: ["creer-visuels", "resoudre-tech", "organiser-gerer", "analyser-comprendre", "creer-projets", "aider-accompagner", "parler-convaincre", "ecrire-raconter"],
  agriculture: ["analyser-comprendre", "organiser-gerer", "aider-accompagner", "creer-projets", "resoudre-tech", "creer-visuels", "ecrire-raconter", "parler-convaincre"],
  service: ["aider-accompagner", "organiser-gerer", "parler-convaincre", "creer-projets", "analyser-comprendre", "ecrire-raconter", "creer-visuels", "resoudre-tech"],
};

export function orderActivityChoicesForDomain(domain, choices) {
  const order = Q2_ACTIVITY_ORDER_BY_Q1[domain];
  if (!order?.length) return choices;
  const byValue = new Map(choices.map((c) => [c.value, c]));
  const sorted = order.filter((v) => byValue.has(v)).map((v) => byValue.get(v));
  const rest = choices.filter((c) => !order.includes(c.value));
  return [...sorted, ...rest];
}
