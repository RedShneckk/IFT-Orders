// =============================================================================
// Page Panier : modifier les quantités, puis valider la commande
// =============================================================================

import { db, collection, getDocs } from "../firebase.js";
import { requireAuth } from "../auth.js";
import { getCart, saveCart, setQuantity, removeFromCart, clearCart, cartTotal, MAX_QUANTITY } from "../cart.js";
import { createOrder } from "../orders.js";
import { escapeHtml, formatPrice, toast, errorMessage } from "../utils.js";

const { user, profile } = await requireAuth(["student"]);

const cartContainer = document.querySelector("#cart");
const form = document.querySelector("#order-form");
const submitBtn = document.querySelector("#submit-btn");

// Identifiants des articles du panier qui ne sont plus commandables
let unavailableIds = new Set();

// -----------------------------------------------------------------------------
// Synchronisation avec le catalogue : le panier peut dater de plusieurs jours,
// un article a pu être modifié, supprimé ou rendu indisponible entre-temps.
// -----------------------------------------------------------------------------
try {
  const snapshot = await getDocs(collection(db, "products"));
  const catalogue = new Map(snapshot.docs.map((d) => [d.id, d.data()]));

  const cart = getCart();
  for (const line of cart) {
    const product = catalogue.get(line.productId);
    if (!product || !product.available) {
      unavailableIds.add(line.productId);
    } else {
      // On reprend le nom et le prix actuels du catalogue
      line.name = product.name;
      line.category = product.category;
      line.price = product.price;
    }
  }
  saveCart(cart);
} catch (error) {
  toast(errorMessage(error), "error");
}

render();

// -----------------------------------------------------------------------------
// Affichage du panier
// -----------------------------------------------------------------------------
function render() {
  const cart = getCart();
  submitBtn.disabled = cart.length === 0 || cart.some((l) => unavailableIds.has(l.productId));

  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <p class="empty">Votre panier est vide.<br>
      <a href="catalogue.html">Parcourir le catalogue</a></p>`;
    return;
  }

  const rows = cart.map((line) => {
    const unavailable = unavailableIds.has(line.productId);
    return `
      <tr>
        <td>
          ${escapeHtml(line.name)}
          ${unavailable ? '<br><span class="badge badge-rejected">Plus disponible : retirez-le</span>' : ""}
        </td>
        <td class="num">${formatPrice(line.price)}</td>
        <td class="num">
          <input type="number" min="1" max="${MAX_QUANTITY}" value="${line.quantity}"
                 data-id="${line.productId}" aria-label="Quantité">
        </td>
        <td class="num">${formatPrice(line.price * line.quantity)}</td>
        <td><button class="btn btn-danger btn-small" data-remove="${line.productId}" aria-label="Retirer">✕</button></td>
      </tr>`;
  }).join("");

  cartContainer.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr><th>Article</th><th class="num">Prix indicatif</th><th class="num">Quantité</th>
              <th class="num">Sous-total</th><th></th></tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><th colspan="3" class="num">Total indicatif</th>
              <th class="num">${formatPrice(cartTotal(cart))}</th><th></th></tr>
        </tfoot>
      </table>
    </div>`;
}

// Changement de quantité
cartContainer.addEventListener("change", (event) => {
  const input = event.target;
  if (!input.dataset.id) return;
  setQuantity(input.dataset.id, parseInt(input.value, 10) || 1);
  render();
});

// Suppression d'une ligne
cartContainer.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  removeFromCart(button.dataset.remove);
  unavailableIds.delete(button.dataset.remove);
  render();
});

// -----------------------------------------------------------------------------
// Validation de la commande
// -----------------------------------------------------------------------------
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const cart = getCart();
  if (cart.length === 0) return;

  // form.elements.title et non form.title : « title » est déjà une propriété
  // de tout élément HTML (l'infobulle), elle masquerait le champ du même nom.
  const title = form.elements.title.value.trim();
  const justification = form.elements.justification.value.trim();
  if (!title || !justification) {
    toast("Le titre et la justification sont obligatoires.", "error");
    return;
  }

  submitBtn.disabled = true;
  try {
    const orderId = await createOrder({ user, profile, cart, title, justification });
    clearCart();
    location.href = `commande.html?id=${orderId}`; // on affiche la commande créée
  } catch (error) {
    toast(errorMessage(error), "error");
    submitBtn.disabled = false;
  }
});
