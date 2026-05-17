import { useState } from "react";
import RecommendedFormationItem from "./RecommendedFormationItem.jsx";

const DEFAULT_VISIBLE = 4;

/**
 * Liste formations d’un métier — affiche peu par défaut, « voir plus » au besoin.
 */
export default function RecommendedFormationsList({
  formations,
  t,
  onAskFormation,
  visibleCount = DEFAULT_VISIBLE,
  showOnisepLink = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const list = Array.isArray(formations) ? formations : [];
  if (!list.length) return null;

  const total = list.length;
  const hasMore = total > visibleCount;
  const shown = !hasMore || expanded ? list : list.slice(0, visibleCount);
  const hidden = total - visibleCount;

  const countLabel =
    total === 1
      ? t("formationsAccessibleOne", "1 formation accessible")
      : t("formationsAccessible", "{count} formations accessibles").replace(
          "{count}",
          String(total)
        );

  return (
    <section className="chatbot-rec-formations-open" aria-label={countLabel}>
      <p className="chatbot-rec-formations-count">{countLabel}</p>
      <ul className="chatbot-rec-formations-list">
        {shown.map((f, j) => (
          <RecommendedFormationItem
            key={`${f.libelle}-${j}`}
            f={f}
            t={t}
            onAskCoach={onAskFormation ? () => onAskFormation(f) : undefined}
            showOnisepLink={showOnisepLink}
          />
        ))}
      </ul>
      {hasMore && !expanded ? (
        <button
          type="button"
          className="rec-formations-toggle"
          onClick={() => setExpanded(true)}
        >
          {t("formationsShowMore", "Voir {count} autres").replace("{count}", String(hidden))}
        </button>
      ) : null}
      {hasMore && expanded ? (
        <button
          type="button"
          className="rec-formations-toggle"
          onClick={() => setExpanded(false)}
        >
          {t("formationsShowLess", "Réduire la liste")}
        </button>
      ) : null}
    </section>
  );
}
