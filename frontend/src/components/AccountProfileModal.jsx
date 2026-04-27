import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  clearAccountProfile,
  deleteMyAccount,
  getAccountProfile,
  getSession,
  logoutUser,
  saveAccountProfile,
} from "../data/authStorage.js";
import { useTranslation } from "../hooks/useTranslation.js";

export default function AccountProfileModal({ open, onClose }) {
  const { t } = useTranslation();
  const ta = (key, fallback) => t("account", key, fallback);
  const session = getSession();
  const email = session?.email || "";
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    pseudo: "",
    age: "",
    city: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const p = getAccountProfile(email) || {};
    setForm({
      firstName: p.firstName || "",
      lastName: p.lastName || "",
      pseudo: p.pseudo || "",
      age: p.age || "",
      city: p.city || "",
    });
    setError("");
  }, [open, email]);

  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const canSave = useMemo(() => !busy && Boolean(email), [busy, email]);

  const onChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSave = () => {
    if (!email) return;
    saveAccountProfile(email, form);
    window.dispatchEvent(new Event("moovup-ui-change"));
    onClose();
  };

  const onDelete = async () => {
    if (!email || busy) return;
    const ok = window.confirm(ta("deleteConfirm", "Supprimer définitivement ton compte ? Cette action est irréversible."));
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await deleteMyAccount();
      clearAccountProfile(email);
      logoutUser();
      window.location.href = "/auth";
    } catch (e) {
      setError(e.message || ta("deleteError", "Suppression impossible pour le moment."));
      setBusy(false);
    }
  };

  if (!open) return null;

  const node = (
    <div className="account-modal-root" role="presentation">
      <button type="button" className="account-modal-scrim" aria-label={ta("closeScrim", "Fermer")} onClick={onClose} />
      <div
        className="account-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
        aria-describedby="account-modal-desc"
      >
        <header className="account-modal-head">
          <div className="account-modal-head-text">
            <p className="account-modal-eyebrow">Moov&apos;Up</p>
            <h2 id="account-modal-title" className="account-modal-title">
              {ta("title", "Mon profil")}
            </h2>
            <p id="account-modal-desc" className="account-modal-lead">
              {ta(
                "subtitle",
                "Mets à jour les infos affichées sur ton compte. L’email reste celui de la connexion."
              )}
            </p>
          </div>
          <button
            type="button"
            className="account-modal-close"
            onClick={onClose}
            aria-label={ta("close", "Fermer")}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="account-modal-body">
          <section className="account-modal-section" aria-labelledby="account-section-account">
            <h3 id="account-section-account" className="account-modal-section-title">
              {ta("sectionAccount", "Compte")}
            </h3>
            <label className="account-field">
              <span>{ta("emailLabel", "Email (compte)")}</span>
              <input
                type="email"
                className="account-input account-input--readonly"
                value={email}
                readOnly
                tabIndex={0}
                autoComplete="email"
              />
            </label>
          </section>

          <section className="account-modal-section" aria-labelledby="account-section-profile">
            <h3 id="account-section-profile" className="account-modal-section-title">
              {ta("sectionProfile", "Identité")}
            </h3>
            <div className="account-grid">
              <label className="account-field">
                <span>{ta("firstName", "Prénom")}</span>
                <input type="text" value={form.firstName} onChange={onChange("firstName")} autoComplete="given-name" />
              </label>
              <label className="account-field">
                <span>{ta("lastName", "Nom")}</span>
                <input type="text" value={form.lastName} onChange={onChange("lastName")} autoComplete="family-name" />
              </label>
            </div>
            <div className="account-grid">
              <label className="account-field">
                <span>{ta("pseudo", "Pseudo")}</span>
                <input type="text" value={form.pseudo} onChange={onChange("pseudo")} autoComplete="nickname" />
              </label>
              <label className="account-field">
                <span>{ta("age", "Âge")}</span>
                <input type="text" inputMode="numeric" value={form.age} onChange={onChange("age")} />
              </label>
            </div>
            <label className="account-field">
              <span>{ta("city", "Ville")}</span>
              <input type="text" value={form.city} onChange={onChange("city")} autoComplete="address-level2" />
            </label>
          </section>

          {error ? <p className="account-error">{error}</p> : null}

          <div className="account-actions">
            <button type="button" className="account-btn account-btn--primary" onClick={onSave} disabled={!canSave}>
              {ta("save", "Enregistrer")}
            </button>
          </div>

          <div className="account-danger-zone">
            <button type="button" className="account-btn account-btn--danger" onClick={onDelete} disabled={busy}>
              {ta("deleteAccount", "Supprimer mon compte")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
