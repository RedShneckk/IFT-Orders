// =============================================================================
// Petites fonctions utilitaires partagées par toutes les pages
// =============================================================================

/**
 * Échappe les caractères spéciaux HTML.
 * À utiliser dès qu'on insère dans innerHTML un texte saisi par un utilisateur
 * (nom de produit, justification, commentaire...) pour éviter l'injection de
 * code (faille XSS).
 */
export function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Formate une date Firestore (Timestamp) ou JS (Date) en français.
 * Juste après un serverTimestamp(), Firestore renvoie localement `null` le temps
 * que le serveur réponde : on affiche alors « à l'instant ».
 */
export function formatDate(value) {
  if (!value) return "à l'instant";
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

/** Convertit une date Firestore en nombre de millisecondes (pour trier). */
export function toMillis(value) {
  if (!value) return Date.now(); // serverTimestamp pas encore confirmé = maintenant
  return typeof value.toMillis === "function" ? value.toMillis() : new Date(value).getTime();
}

const priceFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** 12.5 -> « 12,50 € » */
export function formatPrice(value) {
  return priceFormatter.format(Number(value) || 0);
}

/**
 * Vérifie qu'un lien est bien une URL http(s).
 * Sans ce contrôle, un lien « javascript:... » placé dans un href pourrait
 * exécuter du code au clic.
 */
export function isSafeUrl(url) {
  return /^https?:\/\//i.test(url || "");
}

// -----------------------------------------------------------------------------
// Statuts de commande : libellé affiché + classe CSS du badge
// -----------------------------------------------------------------------------
export const STATUSES = {
  pending:   { label: "En attente", css: "badge-pending" },
  accepted:  { label: "Acceptée",   css: "badge-accepted" },
  rejected:  { label: "Refusée",    css: "badge-rejected" },
  ordered:   { label: "Commandée",  css: "badge-ordered" },
  delivered: { label: "Livrée",     css: "badge-delivered" },
  cancelled: { label: "Annulée",    css: "badge-cancelled" },
};

/** Renvoie le HTML d'un badge coloré pour un statut. */
export function statusBadge(status) {
  const info = STATUSES[status] ?? { label: status, css: "" };
  return `<span class="badge ${info.css}">${escapeHtml(info.label)}</span>`;
}

// Libellés des rôles
export const ROLE_LABELS = {
  student: "Étudiant",
  staff: "Staff",
  admin: "Admin",
};

// -----------------------------------------------------------------------------
// Notifications « toast » (petit message temporaire en bas de l'écran)
// -----------------------------------------------------------------------------
export function toast(message, type = "info") {
  let container = document.querySelector(".toasts");
  if (!container) {
    container = document.createElement("div");
    container.className = "toasts";
    document.body.append(container);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message; // textContent : pas de HTML interprété
  container.append(el);
  setTimeout(() => el.remove(), 4000);
}

// -----------------------------------------------------------------------------
// Traduction des codes d'erreur Firebase en messages lisibles
// -----------------------------------------------------------------------------
const ERROR_MESSAGES = {
  "auth/invalid-email": "Adresse e-mail invalide.",
  "auth/missing-password": "Veuillez saisir un mot de passe.",
  "auth/weak-password": "Mot de passe trop faible (6 caractères minimum).",
  "auth/email-already-in-use": "Un compte existe déjà avec cette adresse e-mail.",
  "auth/invalid-credential": "E-mail ou mot de passe incorrect.",
  "auth/wrong-password": "E-mail ou mot de passe incorrect.",
  "auth/user-not-found": "E-mail ou mot de passe incorrect.",
  "auth/too-many-requests": "Trop de tentatives. Réessayez dans quelques minutes.",
  "auth/network-request-failed": "Problème de connexion réseau.",
  "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
    "Configuration Firebase invalide : vérifiez js/firebase-config.js.",
  "permission-denied": "Action refusée par les règles de sécurité.",
  "not-found": "Document introuvable.",
  unavailable: "Serveur injoignable, vérifiez votre connexion.",
};

export function errorMessage(error) {
  console.error(error); // le détail complet reste visible dans la console (F12)
  return ERROR_MESSAGES[error?.code] ?? `Erreur : ${error?.message ?? error}`;
}

// -----------------------------------------------------------------------------
// Boîte de dialogue pour saisir un commentaire (utilise l'élément <dialog>)
// Renvoie une Promise : le texte saisi, ou null si l'utilisateur annule.
// -----------------------------------------------------------------------------
export function askComment({ title, label = "Commentaire", required = false, confirmText = "Valider" }) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "dialog";
    dialog.innerHTML = `
      <form method="dialog" class="form">
        <h2>${escapeHtml(title)}</h2>
        <label>
          ${escapeHtml(label)}${required ? " (obligatoire)" : " (facultatif)"}
          <textarea name="comment" rows="4" maxlength="500" ${required ? "required" : ""}></textarea>
        </label>
        <div class="actions">
          <button type="button" class="btn btn-secondary" data-cancel>Annuler</button>
          <button type="submit" class="btn">${escapeHtml(confirmText)}</button>
        </div>
      </form>`;
    document.body.append(dialog);

    const form = dialog.querySelector("form");
    let result = null;

    form.addEventListener("submit", (event) => {
      const text = form.comment.value.trim();
      // « required » accepte un texte fait uniquement d'espaces : on revérifie
      if (required && !text) {
        event.preventDefault(); // empêche la fermeture de la boîte
        form.comment.focus();
        return;
      }
      result = text;
    });
    dialog.querySelector("[data-cancel]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => {
      dialog.remove();
      resolve(result);
    });

    dialog.showModal();
  });
}
