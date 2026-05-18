import { useTranslation } from "../../hooks/useTranslation.js";

function FreemiumDesc() {
  const { t } = useTranslation();
  return (
    <p className="pricing-desc pricing-desc--rich pricing-desc--tone-freemium">
      {t("partenaires", "offerFreemiumDescPrefix", "Accès au ")}
      <strong className="pricing-desc-em">
        {t("partenaires", "offerFreemiumDescEm", "diagnostic de base")}
      </strong>
      {t("partenaires", "offerFreemiumDescMid", " avec échanges ")}
      <strong className="pricing-desc-em">{t("partenaires", "offerMoovcoachName", "MoovCoach")}</strong>
      {t("partenaires", "offerFreemiumDescSuffix", " limités.")}
    </p>
  );
}

function PremiumDesc() {
  const { t } = useTranslation();
  return (
    <p className="pricing-desc pricing-desc--rich pricing-desc--tone-premium">
      {t("partenaires", "offerPremiumDescPrefix", "")}
      <strong className="pricing-desc-em">{t("partenaires", "offerPremiumDescEm", "Unlimited")}</strong>
      {t("partenaires", "offerPremiumDescSuffix", " access, CV generation, advanced tools.")}
    </p>
  );
}

function B2bDesc() {
  const { t } = useTranslation();
  return (
    <p className="pricing-desc pricing-desc--rich pricing-desc--tone-b2b">
      {t("partenaires", "offerB2bDescPrefix", "Réservé aux ")}
      <strong className="pricing-desc-em">{t("partenaires", "offerB2bDescEm1", "lycées")}</strong>
      {t("partenaires", "offerB2bDescMid", ", missions locales, structures d’insertion, ")}
      <strong className="pricing-desc-em">{t("partenaires", "offerB2bDescEm2", "grandes structures")}</strong>
      {t("partenaires", "offerB2bDescEnd", ".")}
    </p>
  );
}

/**
 * @param {object} props
 * @param {Record<string, string>} props.ui
 * @param {"interactive" | "preview"} props.variant
 * @param {() => void} [props.onFreemium]
 * @param {() => void} [props.onPremium]
 * @param {() => void} [props.onB2b]
 */
export default function PartenairesPricingCards({ ui, variant, onFreemium, onPremium, onB2b }) {
  const interactive = variant === "interactive";

  const deckCls =
    variant === "preview" ? "pricing-card pricing-card--deck pricing-card--preview" : "pricing-card pricing-card--deck";

  return (
    <>
      <article className={`${deckCls} pricing-card--freemium`}>
        <div className="pricing-card-icon" aria-hidden>
          🎁
        </div>
        <h3 className="pricing-card-heading">{ui.freemiumTitle}</h3>
        <p className="pricing-price">{ui.freemiumPrice}</p>
        <FreemiumDesc />
        <ul className="pricing-features">
          <li>{ui.freemiumF1}</li>
          <li>{ui.freemiumF2}</li>
          <li>{ui.freemiumF3}</li>
        </ul>
        {interactive ? (
          <button type="button" className="lp-btn lp-btn-secondary lp-btn-lg" onClick={onFreemium}>
            {ui.choose}
          </button>
        ) : null}
      </article>

      <article className={`${deckCls} pricing-card--premium pricing-card--featured`}>
        <div className="pricing-badge">{ui.premiumBadge}</div>
        <div className="pricing-card-icon" aria-hidden>
          💎
        </div>
        <h3 className="pricing-card-heading">{ui.premiumTitle}</h3>
        <div className="pricing-price-stack">
          <p className="pricing-price">{ui.premiumPriceMonthly || ui.premiumPrice}</p>
          {ui.premiumPriceAnnual ? (
            <p className="pricing-price-secondary">{ui.premiumPriceAnnual}</p>
          ) : null}
        </div>
        <PremiumDesc />
        <ul className="pricing-features">
          <li>{ui.premiumF1}</li>
          <li>{ui.premiumF2}</li>
          <li>{ui.premiumF3}</li>
          <li>{ui.premiumF4}</li>
        </ul>
        {interactive ? (
          <button type="button" className="lp-btn lp-btn-primary lp-btn-lg" onClick={onPremium}>
            {ui.choose}
          </button>
        ) : null}
      </article>

      <article className={`${deckCls} pricing-card--b2b`}>
        <div className="pricing-card-icon" aria-hidden>
          🏛
        </div>
        <h3 className="pricing-card-heading">{ui.b2bTitle}</h3>
        <p className="pricing-price">{ui.b2bPrice}</p>
        <B2bDesc />
        <ul className="pricing-features">
          <li>{ui.b2bF1}</li>
          <li>{ui.b2bF2}</li>
          <li>{ui.b2bF3}</li>
          <li>{ui.b2bF4}</li>
        </ul>
        {interactive ? (
          <button type="button" className="lp-btn lp-btn-primary lp-btn-lg" onClick={onB2b}>
            {ui.dashboard}
          </button>
        ) : null}
      </article>
    </>
  );
}
