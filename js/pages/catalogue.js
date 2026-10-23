// =============================================================================
// Page Catalogue : liste des articles, recherche, filtre, ajout au panier
// =============================================================================

import { db, collection, getDocs } from "../firebase.js";
import { requireAuth } from "../auth.js";
import { addToCart, MAX_QUANTITY } from "../cart.js";
import { escapeHtml, formatPrice, isSafeUrl, toast, errorMessage } from "../utils.js";

const { profile } = await requireAuth(); // tous les rôles connectés

// Seuls les étudiants passent commande : les autres voient le catalogue en lecture
const canOrder = profile.role === "student";

const container = document.querySelector("#products");
const searchInput = document.querySelector("#search");
const categorySelect = document.querySelector("#category-filter");
const onlyAvailable = document.querySelector("#only-available");
document.querySelector("#go-cart").hidden = !canOrder;

let products = []; // tous les produits chargés depuis Firestore

// -----------------------------------------------------------------------------
// Chargement des produits
// -----------------------------------------------------------------------------
try {
  const snapshot = await getDocs(collection(db, "products"));
  products = snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  fillCategories();
  render();
} catch (error) {
  container.innerHTML = `<p class="alert alert-error">${escapeHtml(errorMessage(error))}</p>`;
}

/** Construit la liste des catégories à partir des produits existants. */
function fillCategories() {
  const categories = [...new Set(products.map((p) => p.category))].sort((a, b) => a.localeCompare(b, "fr"));
  for (const category of categories) {
    categorySelect.add(new Option(category, category));
  }
}

// -----------------------------------------------------------------------------
// Affichage filtré
// -----------------------------------------------------------------------------
function render() {
  const search = searchInput.value.trim().toLowerCase();
  const category = categorySelect.value;

  const visible = products.filter((p) =>
    (!category || p.category === category) &&
    (!onlyAvailable.checked || p.available) &&
    (!search || `${p.name} ${p.description}`.toLowerCase().includes(search))
  );

  if (visible.length === 0) {
    container.innerHTML = `<p class="empty">${products.length ? "Aucun article ne correspond à la recherche." : "Le catalogue est vide pour le moment."}</p>`;
    return;
  }

  container.innerHTML = visible.map(productCard).join("");
}

function productCard(p) {
  const supplier = isSafeUrl(p.supplierUrl)
    ? `<a href="${escapeHtml(p.supplierUrl)}" target="_blank" rel="noopener noreferrer">Voir chez le fournisseur ↗</a>`
    : "";

  // Formulaire d'ajout : seulement pour un étudiant et si l'article est disponible
  let addForm = "";
  if (canOrder && p.available) {
    addForm = `
      <form class="add-row" data-id="${p.id}">
        <input type="number" name="quantity" value="1" min="1" max="${MAX_QUANTITY}" aria-label="Quantité">
        <button type="submit" class="btn">Ajouter</button>
      </form>`;
  }

  return `
    <article class="card product ${p.available ? "" : "unavailable"}">
      <div><span class="badge badge-category">${escapeHtml(p.category)}</span>
        ${p.available ? "" : '<span class="badge badge-rejected">Indisponible</span>'}</div>
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.description)}</p>
      <span class="price">≈ ${formatPrice(p.price)}</span>
      ${supplier}
      ${addForm}
    </article>`;
}

// Re-filtrer à chaque saisie / changement
searchInput.addEventListener("input", render);
categorySelect.addEventListener("change", render);
onlyAvailable.addEventListener("change", render);

// -----------------------------------------------------------------------------
// Ajout au panier (délégation d'événement : un seul écouteur pour toutes les cartes)
// -----------------------------------------------------------------------------
container.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  const product = products.find((p) => p.id === form.dataset.id);
  const quantity = parseInt(form.quantity.value, 10);

  if (!product || !(quantity >= 1)) return;

  addToCart(product, quantity);
  toast(`${quantity} × ${product.name} ajouté au panier`, "success");
  form.quantity.value = 1;
});
