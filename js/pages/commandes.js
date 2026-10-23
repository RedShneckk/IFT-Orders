// =============================================================================
// Page « Mes commandes » (étudiant) : liste en temps réel de SES commandes
// =============================================================================

import { db, collection, query, where, onSnapshot } from "../firebase.js";
import { requireAuth } from "../auth.js";
import { escapeHtml, formatDate, formatPrice, statusBadge, toMillis, STATUSES, errorMessage } from "../utils.js";

const { user } = await requireAuth(["student"]);

const tbody = document.querySelector("#orders");
const searchInput = document.querySelector("#search");
const statusFilter = document.querySelector("#status-filter");

// Remplit la liste déroulante des statuts
for (const [value, { label }] of Object.entries(STATUSES)) {
  statusFilter.add(new Option(label, value));
}

let orders = [];

// -----------------------------------------------------------------------------
// Écoute en temps réel. Le filtre where("userId", "==", uid) est OBLIGATOIRE :
// les règles refusent toute requête qui pourrait renvoyer la commande d'un
// autre étudiant (une règle n'est pas un filtre, c'est un contrôle).
// -----------------------------------------------------------------------------
const myOrders = query(collection(db, "orders"), where("userId", "==", user.uid));

onSnapshot(
  myOrders,
  (snapshot) => {
    orders = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)); // plus récentes d'abord
    render();
  },
  (error) => {
    tbody.innerHTML = `<tr><td colspan="6" class="alert-error">${escapeHtml(errorMessage(error))}</td></tr>`;
  }
);

function render() {
  const search = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;

  const visible = orders.filter((o) =>
    (!status || o.status === status) &&
    (!search || o.title.toLowerCase().includes(search))
  );

  if (visible.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">
      ${orders.length ? "Aucune commande ne correspond aux filtres." : "Vous n'avez pas encore passé de commande."}
    </td></tr>`;
    return;
  }

  tbody.innerHTML = visible.map((o) => `
    <tr class="clickable" data-id="${o.id}">
      <td>${statusBadge(o.status)}</td>
      <td>${escapeHtml(o.title)}</td>
      <td class="num">${o.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
      <td class="num">${formatPrice(o.total)}</td>
      <td>${formatDate(o.updatedAt)}</td>
      <td>${formatDate(o.createdAt)}</td>
    </tr>`).join("");
}

searchInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);

// Clic sur une ligne -> page de détail
tbody.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-id]");
  if (row) location.href = `commande.html?id=${row.dataset.id}`;
});
