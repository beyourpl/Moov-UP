/** Petit « tick » de validation (Web Audio, aucun fichier externe). */

let sharedCtx = null;

function getAudioContext() {
  const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  if (!sharedCtx) sharedCtx = new AC();
  return sharedCtx;
}

function beep(ctx, startTime) {
  const t0 = startTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(920, t0);
  osc.frequency.exponentialRampToValueAtTime(520, t0 + 0.07);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.07, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.12);
}

/**
 * Joue un court signal agréable. Ignore silencieusement si l’API audio est indisponible.
 */
export function playQuizTickSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const run = () => {
      const t = ctx.currentTime;
      beep(ctx, t);
    };

    if (ctx.state === "suspended") {
      void ctx.resume().then(run);
    } else {
      run();
    }
  } catch {
    /* navigateurs restreints, autoplay policies, etc. */
  }
}
