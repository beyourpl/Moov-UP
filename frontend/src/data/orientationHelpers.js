import { specialtyConfig } from "./specialtyConfig.js";
import { getSpecialtyChoiceText } from "./specialtyLabels.js";

export { QUESTION_ORDER } from "./questionOrder.js";
export { specialtyConfig };

const specialtyNormalize = {
  tech: {
    cyber: "cyber",
    dev: "dev",
    reseaux: "reseaux",
    web: "dev",
    data: "dev",
    ia: "dev",
    cloud: "reseaux",
    support: "dev",
    qa: "dev",
    "autre-tech": "dev",
  },
  business: {
    commerce: "commerce",
    marketing: "marketing",
    management: "management",
    finance: "management",
    rh: "management",
    entrepreneuriat: "management",
    vente: "commerce",
    "gestion-projet": "management",
    "relation-client": "commerce",
    "autre-business": "management",
  },
  creative: {
    graphisme: "graphisme",
    design: "design",
    audiovisuel: "audiovisuel",
    uxui: "design",
    animation: "animation",
    photo: "audiovisuel",
    "direction-artistique": "graphisme",
    montage: "audiovisuel",
    "motion-design": "animation",
    "autre-creative": "design",
  },
  sante: {
    medecine: "medecine",
    "soins-infirmiers": "soins-infirmiers",
    kinesitherapie: "kinesitherapie",
    "sage-femme": "sage-femme",
    pharmacie: "pharmacie",
    odontologie: "medecine",
    psychologie: "psychologie",
    "aide-soignante": "aide-soignante",
    ergotherapie: "ergotherapie",
    "autre-sante": "medecine",
  },
  education: {
    enseignant: "enseignant",
    "education-specialisee": "education-specialisee",
    "direction-ecole": "direction-ecole",
    "formation-adulte": "formation-adulte",
    "soutien-scolaire": "soutien-scolaire",
    animation: "animation",
    orientation: "orientation",
    pedagogie: "pedagogie",
    "autre-education": "enseignant",
  },
  droit: {
    avocat: "avocat",
    magistrat: "magistrat",
    notaire: "notaire",
    huissier: "huissier",
    juriste: "juriste",
    "police-judiciaire": "juriste",
    "droit-immobilier": "juriste",
    "droit-travail": "juriste",
    "autre-droit": "juriste",
  },
  industrie: {
    ingenierie: "ingenierie",
    production: "production",
    maintenance: "maintenance",
    qualite: "qualite",
    logistique: "logistique",
    achats: "achats",
    "bureau-etudes": "ingenierie",
    "autre-industrie": "ingenierie",
  },
  batiment: {
    architecture: "architecture",
    btp: "btp",
    "genie-civil": "genie-civil",
    "batiment-durable": "btp",
    "architecture-interieur": "architecture",
    topographie: "topographie",
    bet: "bet",
    "autre-batiment": "btp",
  },
  agriculture: {
    "agriculture-elevage": "agriculture-elevage",
    agronomie: "agronomie",
    environnement: "environnement",
    agroalimentaire: "agroalimentaire",
    paysage: "paysage",
    foret: "foret",
    marine: "marine",
    "autre-agriculture": "agriculture-elevage",
  },
  service: {
    tourisme: "tourisme",
    hotellerie: "hotellerie",
    sport: "sport",
    evenementiel: "evenementiel",
    rh: "rh",
    comptabilite: "comptabilite",
    banque: "banque",
    "autre-service": "service",
  },
};

export function normalizeSpecialty(domain, specialty) {
  return specialtyNormalize[domain]?.[specialty];
}

export function getSpecialtyLabel(domain, specialty, language = "fr") {
  const t = getSpecialtyChoiceText(language, domain, specialty, {}).title;
  return t || specialty;
}

export const levelLabels = {
  college: "Collège",
  seconde: "Seconde/Première",
  terminale: "Terminale",
  bac: "Bac",
  bac2: "Bac+2",
  bac3: "Bac+3",
  bac5: "Bac+5",
};

export const methodLabels = {
  pratique: "tu aimes apprendre par la pratique",
  equilibre: "tu sembles aimer un équilibre entre théorie et pratique",
  theorie: "tu préfères d'abord comprendre les concepts",
};

export const environmentLabels = {
  bureau: "tu te projettes en entreprise, dans un cadre structuré",
  laboratoire: "tu te projettes en recherche ou en expérimentation",
  terrain: "tu te projettes sur le terrain, au contact direct",
  itinérant: "tu te projettes en déplacement, sur plusieurs lieux",
  distanciel: "tu te projettes en télétravail ou en ligne",
};

export const paceLabels = {
  court: "tu préfères avancer vite vers des formations professionnalisantes",
  progressif: "tu privilégies une progression étape par étape",
  long: "tu es prêt(e) à viser un parcours plus long pour approfondir",
};

export const guidanceLabels = {
  encadre: "tu performes mieux avec un cadre clair et régulier",
  mixte: "tu apprécies un équilibre entre autonomie et accompagnement",
  autonome: "tu es à l'aise avec un haut niveau d'autonomie",
};

export const priorityLabels = {
  insertion: "tu veux entrer rapidement dans la vie active",
  expertise: "tu vises à devenir spécialiste dans un domaine",
  flexibilite: "tu veux garder plusieurs options ouvertes",
  creation: "tu veux créer ton propre activité",
};

export const mobilityLabels = {
  local: "tu préfères rester près de chez toi",
  mobile: "tu es prêt(e) à bouger en France",
  international: "tu es ouvert(e) à l'international",
  distanciel: "tu privilégies les formations à distance",
};

export const urgencyLabels = {
  urgent: "tu es pressé(e) de trouver une solution",
  normal: "tu prends le temps de bien réfléchir",
  sans_presse: "tu explores sans vraie urgence",
};
