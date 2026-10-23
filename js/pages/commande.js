// =============================================================================
// Page de détail d'une commande (commande.html?id=...)
// Articles, justification, historique des statuts et boutons d'action.
// =============================================================================

import { db, doc, onSnapshot } from "../firebase.js";
import { requireAuth } from "../auth.js";
import { nextStatuses, runStatusAction, ACTION_LABELS } from "../orders.js";
import { escapeHtml, formatDate, formatPrice, statusBadge, STATUSES } from "../utils.js";

const { user, profile } = await requireAuth();

const container = document.querySelector("#order");
const isStaff = profile.role === "staff" || profile.role === "admin";

// Le lien « retour » dépend du rôle
document.querySelector("#back-link").href = isStaff ? "staff.html" : "commandes.html";

// Identifiant de la commande, lu dans l'URL : commande.html?id=XXXX
const orderId = new URLSearchParams(location.search).get("id");
let order = null;

if (!orderId) {
  showError("Aucune commande indiquée.");
} else {
  // Écoute en temps réel : la page se met à jour si le statut change
  onSnapshot(
    doc(db, "orders", orderId),
    (snap) => {
      if (!snap.exists()) {
        showError("Commande introuvable.");
        return;
      }
      order = { id: snap.id, ...snap.data() };
      render();
    },
    // Un étudiant qui tente d'ouvrir la commande d'un autre arrive ici :
    // les règles Firestore refusent la lecture (permission-denied).
    () => showError("Commande introuvable ou accès refusé.")
  );
}

function showError(text) {
  container.innerHTML = `<p class="alert alert-error">${escapeHtml(text)}</p>`;
}

// -----------------------------------------------------------------------------
// Affichage
// -----------------------------------------------------------------------------
function render() {
  document.title = `${order.title} · Commandes IFT`;

  // Boutons d'action possibles pour cet utilisateur et ce statut
  const buttons = nextStatuses(order, profile).map((status) => `
    <button class="btn ${status === "rejected" || status === "cancelled" ? "btn-danger" : ""}"
            data-status="${status}">${ACTION_LABELS[status]}</button>`).join("");

  const itemRows = order.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.category)}</td>
      <td class="num">${formatPrice(item.price)}</td>
      <td class="num">${item.quantity}</td>
      <td class="num">${formatPrice(item.price * item.quantity)}</td>
    </tr>`).join("");

  // Historique : le plus récent en haut
  const history = [...order.history].reverse().map((entry) => `
    <li>
      ${statusBadge(entry.status)}
      <span class="when">${formatDate(entry.at)} · par ${escapeHtml(entry.byEmail)}</span>
      ${entry.comment ? `<p class="comment">${escapeHtml(entry.comment)}</p>` : ""}
    </li>`).join("");

  container.innerHTML = `
    <section class="card stack">
      <div class="order-header">
        <h1>${escapeHtml(order.title)}</h1>
        ${statusBadge(order.status)}
      </div>
      <dl class="meta">
        <dt>Demandeur</dt><dd>${escapeHtml(order.userName)} (${escapeHtml(order.userEmail)})</dd>
        <dt>Créée le</dt><dd>${formatDate(order.createdAt)}</dd>
        <dt>Mise à jour</dt><dd>${formatDate(order.updatedAt)}</dd>
        <dt>Total indicatif</dt><dd>${formatPrice(order.total)}</dd>
      </dl>
      ${buttons ? `<div class="actions">${buttons}</div>` : ""}
    </section>

    <section class="card">
      <h2>Projet / justification</h2>
      <p class="justification">${escapeHtml(order.justification)}</p>
    </section>

    <section class="card">
      <h2>Articles</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Article</th><th>Catégorie</th><th class="num">Prix indicatif</th>
                <th class="num">Quantité</th><th class="num">Sous-total</th></tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <h2>Historique</h2>
      <ol class="timeline">${history}</ol>
    </section>`;
}

// -----------------------------------------------------------------------------
// Clic sur un bouton d'action
// -----------------------------------------------------------------------------
container.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-status]");
  if (!button || !order) return;

  const newStatus = button.dataset.status;
  if (!STATUSES[newStatus]) return;

  button.disabled = true;
  await runStatusAction(order, newStatus, user);
  button.disabled = false; // la page aura de toute façon été redessinée si ça a marché
});
