// =============================================================================
// Panier, stocké dans le navigateur (localStorage)
// -----------------------------------------------------------------------------
// Le panier n'a pas besoin d'être en base : il ne devient une vraie donnée
// qu'au moment où l'étudiant valide sa commande (voir orders.js).
// Format : [{ productId, name, category, price, quantity }, ...]
// =============================================================================

const STORAGE_KEY = "ift-cart";
export const MAX_QUANTITY = 99;

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return []; // localStorage indisponible ou contenu illisible
  }
}

export function saveCart(cart) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // navigation privée stricte : le panier ne sera pas conservé
  }
  // Prévient le reste de la page (ex. compteur du menu) que le panier a changé
  window.dispatchEvent(new CustomEvent("cart-changed"));
}

/** Ajoute un produit (ou augmente sa quantité s'il est déjà dans le panier). */
export function addToCart(product, quantity = 1) {
  const cart = getCart();
  const line = cart.find((item) => item.productId === product.id);
  if (line) {
    line.quantity = Math.min(line.quantity + quantity, MAX_QUANTITY);
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      quantity: Math.min(quantity, MAX_QUANTITY),
    });
  }
  saveCart(cart);
}

export function setQuantity(productId, quantity) {
  const cart = getCart();
  const line = cart.find((item) => item.productId === productId);
  if (line) {
    line.quantity = Math.max(1, Math.min(quantity, MAX_QUANTITY));
    saveCart(cart);
  }
}

export function removeFromCart(productId) {
  saveCart(getCart().filter((item) => item.productId !== productId));
}

export function clearCart() {
  saveCart([]);
}

/** Nombre total d'articles (somme des quantités). */
export function cartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

/** Total indicatif du panier. */
export function cartTotal(cart = getCart()) {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
