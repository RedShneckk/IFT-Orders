// =============================================================================
// Tableau de bord staff / admin : toutes les commandes, filtres et actions
// =============================================================================

import { db, collection, onSnapshot } from "../firebase.js";
import { requireAuth } from "../auth.js";
import { nextStatuses, runStatusAction, ACTION_LABELS } from "../orders.js";
import { escapeHtml, formatDate, formatPrice, statusBadge, toMillis, STATUSES, errorMessage } from "../utils.js";

const { user, profile } = await requireAuth(["staff", "admin"]);

const tbody = document.querySelector("#orders");
const searchInput = document.querySelector("#search");
const sortSelect = document.querySelector("#sort");
const statusFilter = document.querySelector("#status-filter");
const statusOptions = statusFilter.querySelector(".options");

let orders = [];

// -----------------------------------------------------------------------------
// Filtre des statuts : une case à cocher par statut.
// Par défaut tout est coché sauf « Annulée » (comme « 5 selected » sur le site officiel).
// -----------------------------------------------------------------------------
statusOptions.innerHTML = Object.entries(STATUSES).map(([value, { label }]) => `
  <label>
    <input type="checkbox" value="${value}" ${value === "cancelled" ? "" : "checked"}>
    ${label} <span class="hint" data-count="${value}"></span>
  </label>`).join("");

function selectedStatuses() {
  return [...statusOptions.querySelectorAll("input:checked")].map((input) => input.value);
}

function updateFilterSummary() {
  const count = selectedStatuses().length;
  statusFilter.querySelector("summary").textContent =
    `Statut : ${count} sélectionné${count > 1 ? "s" : ""}`;
}
updateFilterSummary();

// Ferme la liste des statuts quand on clique ailleurs
document.addEventListener("click", (event) => {
  if (!statusFilter.contains(event.target)) statusFilter.open = false;
});

// -----------------------------------------------------------------------------
// Écoute en temps réel de TOUTES les commandes.
// Autorisé par les règles uniquement parce que l'utilisateur est staff ou admin.
// -----------------------------------------------------------------------------
onSnapshot(
  collection(db, "orders"),
  (snapshot) => {
    orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    updateCounts();
    render();
  },
  (error) => {
    tbody.innerHTML = `<tr><td colspan="7" class="alert-error">${escapeHtml(errorMessage(error))}</td></tr>`;
  }
);

/** Affiche le nombre de commandes de chaque statut à côté des cases à cocher. */
function updateCounts() {
  for (const status of Object.keys(STATUSES)) {
    const count = orders.filter((o) => o.status === status).length;
    statusOptions.querySelector(`[data-count="${status}"]`).textContent = `(${count})`;
  }
}

// -----------------------------------------------------------------------------
// Affichage filtré et trié
// -----------------------------------------------------------------------------
function render() {
  const search = searchInput.value.trim().toLowerCase();
  const statuses = selectedStatuses();
  const sortField = sortSelect.value; // "createdAt" ou "updatedAt"

  const visible = orders
    .filter((o) => statuses.includes(o.status))
    .filter((o) => !search ||
      `${o.title} ${o.userName} ${o.userEmail}`.toLowerCase().includes(search))
    .sort((a, b) => toMillis(b[sortField]) - toMillis(a[sortField]));

  if (visible.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">Aucune commande à afficher.</td></tr>`;
    return;
  }

  tbody.innerHTML = visible.map((o) => {
    const buttons = nextStatuses(o, profile).map((status) => `
      <button class="btn btn-small ${status === "rejected" || status === "cancelled" ? "btn-danger" : ""}"
              data-status="${status}">${ACTION_LABELS[status]}</button>`).join("");

    return `
      <tr class="clickable" data-id="${o.id}">
        <td>${statusBadge(o.status)}</td>
        <td>${escapeHtml(o.title)}</td>
        <td>${escapeHtml(o.userName)}<br><span class="hint">${escapeHtml(o.userEmail)}</span></td>
        <td class="num">${formatPrice(o.total)}</td>
        <td>${formatDate(o.updatedAt)}</td>
        <td>${formatDate(o.createdAt)}</td>
        <td><div class="cell-actions">${buttons}</div></td>
      </tr>`;
  }).join("");
}

searchInput.addEventListener("input", render);
sortSelect.addEventListener("change", render);
statusOptions.addEventListener("change", () => {
  updateFilterSummary();
  render();
});

// -----------------------------------------------------------------------------
// Clics dans le tableau : bouton d'action, sinon ouverture du détail
// -----------------------------------------------------------------------------
tbody.addEventListener("click", async (event) => {
  const row = event.target.closest("tr[data-id]");
  if (!row) return;
  const order = orders.find((o) => o.id === row.dataset.id);

  const button = event.target.closest("[data-status]");
  if (button) {
    button.disabled = true;
    await runStatusAction(order, button.dataset.status, user);
    button.disabled = false;
    return;
  }

  location.href = `commande.html?id=${row.dataset.id}`;
});
