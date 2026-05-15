/**
 * Libellés partagés pour les cartes d’offres (tarifs + lignes de fonctionnalités).
 */
export function buildPartenairesOfferUi(t) {
  return {
    freemiumTitle: t("partenaires", "offerFreemiumTitle", "FREEMIUM"),
    freemiumPrice: t("partenaires", "offerFreemiumPrice", "Gratuit"),
    freemiumDesc: t(
      "partenaires",
      "offerFreemiumDesc",
      "Accès au diagnostic de base avec échanges Moov’Coach limités."
    ),
    freemiumF1: t("partenaires", "offerFreemiumF1", "Diagnostic de base"),
    freemiumF2: t("partenaires", "offerFreemiumF2", "Recommandations limitées"),
    freemiumF3: t("partenaires", "offerFreemiumF3", "Moov’Coach limité"),
    premiumTitle: t("partenaires", "offerPremiumTitle", "PREMIUM B2C"),
    premiumBadge: t("partenaires", "offerPremiumBadge", "★ Le plus populaire"),
    premiumPrice: t("partenaires", "offerPremiumPrice", "1,99€ / mois"),
    premiumDesc: t(
      "partenaires",
      "offerPremiumDesc",
      "Accès illimité, génération CV, outils avancés."
    ),
    premiumF1: t("partenaires", "offerPremiumF1", "Accès illimité"),
    premiumF2: t("partenaires", "offerPremiumF2", "Génération CV & lettre"),
    premiumF3: t("partenaires", "offerPremiumF3", "Préparation entretiens"),
    premiumF4: t("partenaires", "offerPremiumF4", "Moov’Coach illimité"),
    b2bTitle: t("partenaires", "offerB2bTitle", "LICENCES B2B"),
    b2bPrice: t("partenaires", "offerB2bPrice", "À partir de 2 000€ / an"),
    b2bDesc: t(
      "partenaires",
      "offerB2bDesc",
      "Réservé aux lycées, missions locales, structures d’insertion, grandes structures."
    ),
    b2bF1: t("partenaires", "offerB2bF1", "Tableau de bord collectif"),
    b2bF2: t("partenaires", "offerB2bF2", "Suivi de cohortes"),
    b2bF3: t("partenaires", "offerB2bF3", "Rapports et statistiques"),
    b2bF4: t("partenaires", "offerB2bF4", "Accompagnement dédié"),
    choose: t("partenaires", "offerChoose", "Choisir"),
    dashboard: t("partenaires", "goDashboard", "Ouvrir le tableau de bord"),
    freemiumTagline: t("partenaires", "offerFreemiumTagline", "MOTEUR D'ACQUISITION"),
    premiumTagline: t("partenaires", "offerPremiumTagline", "MOTEUR DE MONÉTISATION"),
    b2bTagline: t("partenaires", "offerB2bTagline", "MOTEUR DE STABILISATION"),
  };
}

export function buildPartenairesAuthOffersSectionUi(t) {
  return {
    eyebrow: t("partenaires", "authOffersEyebrow", "Offres"),
    title: t("partenaires", "authOffersTitle", "Tarifs et fonctionnalités"),
    lead: t(
      "partenaires",
      "authOffersLead",
      "Après connexion, tu sélectionnes la formule adaptée à ta structure ou à ton réseau."
    ),
    foot: t(
      "partenaires",
      "authOffersFoot",
      "Espace partenaires : présentation et étapes"
    ),
    footLink: t("partenaires", "authOffersFootLink", "Voir l’accueil partenaires"),
  };
}
