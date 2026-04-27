/** Textes du fil diplômes (modale parcours) — alignés sur quizPathwaySummary historique. */
export const PATHWAY_TRAJECTORY_BUNDLES = {
  fr: {
    q3: {
      college: {
        title: "Depuis le collège",
        lines: [
          "Consolider les bases au lycée (Seconde → Première → Terminale).",
          "Préparer le baccalauréat adapté à ton projet (général, techno ou professionnel).",
          "Ensuite : orientation post-bac (BTS, BUT, CPGE, apprentissage…).",
        ],
      },
      seconde: {
        title: "Depuis la Seconde",
        lines: [
          "Affiner ton choix d’enseignements en Première / Terminale selon ton domaine.",
          "Viser le bac comme prochaine étape majeure.",
          "Puis construire un dossier post-bac (Parcoursup, BTS, BUT, école…).",
        ],
      },
      terminale: {
        title: "En terminale",
        lines: [
          "Objectif immédiat : réussir le bac et structurer ton vœu post-bac.",
          "Pistes fréquentes : BTS (2 ans), BUT sur 3 ans, licence, CPGE, école en apprentissage…",
          "Tes réponses sur le rythme (Q6) et l’encadrement (Q7) orientent vers des filières plus cadrées ou plus autonomes.",
        ],
      },
      bac: {
        title: "Bac en poche",
        lines: [
          "Tu peux viser un BTS (2 ans), un BUT (3 ans), une licence, une école en admission parallèle…",
          "Si tu vises une insertion rapide (Q9), les formations courtes en alternance sont souvent cohérentes.",
          "Si tu vises l’expertise, anticipe une poursuite vers bac+3 / bac+5.",
        ],
      },
      bac2: {
        title: "Déjà bac+2",
        lines: [
          "Valoriser ton diplôme : licence pro, bachelor, passerelles vers école, complément en alternance…",
          "La suite dépend fortement du métier visé et des passerelles du domaine.",
        ],
      },
      bac3: {
        title: "Niveau licence / bac+3",
        lines: [
          "Pistes classiques : Master universitaire, MSc, école spécialisée, double cursus.",
          "Affine avec les fiches métiers et les prérequis des formations ciblées.",
        ],
      },
      bac5: {
        title: "Niveau bac+5",
        lines: [
          "Spécialisation, certifs métiers, doctorat ou premiers postes à responsabilité croissante.",
          "Le marché et le secteur (Q1 / spécialité Q4) dictent les suites les plus pertinentes.",
        ],
      },
    },
    fallback: {
      title: "Parcours personnalisé",
      lines: ["Affine ton projet avec les recommandations et les fiches ONISEP."],
    },
    niveauCeiling: {
      4: "Bac (et formations équivalentes)",
      5: "Bac+2 (BTS, DUT, BUT 1re année…)",
      6: "Bac+3 (Licence, BUT…)",
      7: "Bac+5 et plus (Master, école…)",
    },
    filterLine:
      "Les formations proposées dans Moov’Up sont cohérentes avec ton niveau actuel : elles montent jusqu’à environ « {ceiling} » (filtre lié à ta réponse sur ta scolarité).",
    extraQ9Insertion:
      "Tu as indiqué viser une insertion rapide : pense aux cursus courts, professionnalisants ou en alternance lorsque c’est possible.",
    extraQ9Expertise:
      "Tu as indiqué viser l’expertise : prévois en général un parcours plus long (bac+3 à bac+5) selon les métiers du domaine.",
    extraQ6Autonome:
      "Tu t’orientes vers plus d’autonomie : les licences, certains BUT ou écoles peuvent correspondre à ce fonctionnement.",
    extraQ6Encadre:
      "Tu préfères un cadre clair : BTS, formations sous statut scolaire ou apprentissage encadré peuvent être des pistes à explorer.",
  },
  en: {
    q3: {
      college: {
        title: "From middle school",
        lines: [
          "Strengthen foundations in high school (10th → 11th → 12th grade).",
          "Prepare the diploma that fits your track (general, technical, or vocational).",
          "Then: post-secondary orientation (two-year tech degrees, bachelor, prep classes, work-study…).",
        ],
      },
      seconde: {
        title: "From 10th grade",
        lines: [
          "Refine your subjects in 11th / 12th grade according to your field.",
          "Aim for graduation as the next major milestone.",
          "Then build a post-secondary plan (applications, two-year degrees, bachelor, school…).",
        ],
      },
      terminale: {
        title: "In final year",
        lines: [
          "Immediate goal: graduate and structure your post-secondary choices.",
          "Common routes: two-year technical degree, three-year bachelor, prep school, work-study programs…",
          "Your answers on pace (Q6) and support (Q7) point to more structured or more autonomous paths.",
        ],
      },
      bac: {
        title: "Graduated",
        lines: [
          "You can target a two-year technical degree, a three-year bachelor, a university track, or parallel admissions…",
          "If you want quick entry (Q9), shorter, work-based programs often fit well.",
          "If you target expertise, plan for longer study (roughly bachelor to master level) depending on the job.",
        ],
      },
      bac2: {
        title: "Already at associate level (+2)",
        lines: [
          "Build on your diploma: professional bachelor, top-up, bridges to specialized schools, work-study add-ons…",
          "Next steps depend heavily on the target job and bridges in your field.",
        ],
      },
      bac3: {
        title: "Bachelor level (+3)",
        lines: [
          "Typical paths: master’s, MSc, specialized school, dual programs.",
          "Refine with job sheets and prerequisites for target programs.",
        ],
      },
      bac5: {
        title: "Master level (+5)",
        lines: [
          "Specialization, professional certs, doctorate, or early roles with growing responsibility.",
          "Market and sector (Q1 / specialty Q4) drive the most relevant next steps.",
        ],
      },
    },
    fallback: {
      title: "Personalized pathway",
      lines: ["Refine your plan with the recommendations and official job-education sheets."],
    },
    niveauCeiling: {
      4: "High school diploma (and equivalent)",
      5: "+2 (two-year technical degree, etc.)",
      6: "+3 (bachelor’s, three-year degree…)",
      7: "+5 and beyond (master’s, grande école…)",
    },
    filterLine:
      "Trainings suggested in Moov'Up match your current level: they go up to about « {ceiling} » (filter based on your school level answer).",
    extraQ9Insertion:
      "You said you want quick workforce entry: consider shorter, career-focused, or work-study tracks when possible.",
    extraQ9Expertise:
      "You said you want deep expertise: plan for a longer path (often bachelor to master level) depending on the jobs in your field.",
    extraQ6Autonome:
      "You lean toward autonomy: some bachelor programs, certain three-year degrees, or schools may fit that style.",
    extraQ6Encadre:
      "You prefer a clear framework: two-year technical degrees, school-based tracks, or structured apprenticeships can be good leads.",
  },
};

export function getPathwayTrajectoryBundle(language) {
  return PATHWAY_TRAJECTORY_BUNDLES[language] || PATHWAY_TRAJECTORY_BUNDLES.en;
}
