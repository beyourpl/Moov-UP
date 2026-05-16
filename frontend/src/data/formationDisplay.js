/** Affichage des formations ONISEP (métiers recommandés). */

function clean(s) {
  const t = String(s ?? "").trim();
  if (!t || t.toLowerCase() === "nan") return "";
  return t;
}

/** Ligne synthèse : type, niveau, durée (API ou repli côté client). */
export function getFormationResume(f) {
  const resume = clean(f?.resume);
  if (resume) return resume;
  const parts = [];
  const typeF = clean(f?.type_formation);
  if (typeF) parts.push(typeF);
  const sortie = clean(f?.niveau_sortie);
  if (sortie) parts.push(sortie);
  else if (clean(f?.niveau_label)) parts.push(clean(f.niveau_label));
  const duree = clean(f?.duree);
  if (duree) parts.push(duree.toLowerCase().includes("an") ? duree : `Durée : ${duree}`);
  return parts.join(" · ");
}

/** Badges courts pour affichage en chips. */
export function getFormationBadges(f) {
  const badges = [];
  const typeF = clean(f?.type_formation);
  if (typeF) badges.push({ key: "type", label: typeF });
  const sortie = clean(f?.niveau_sortie);
  if (sortie) badges.push({ key: "sortie", label: sortie });
  const duree = clean(f?.duree);
  if (duree) badges.push({ key: "duree", label: duree });
  const dom = clean(f?.domain_label);
  if (dom) badges.push({ key: "domain", label: dom });
  return badges;
}

export function formatFormationDomainHint(f, t) {
  const dom = clean(f?.domain_label);
  if (!dom) return "";
  return t("formationDomain", "Domaine : {domain}").replace("{domain}", dom);
}
