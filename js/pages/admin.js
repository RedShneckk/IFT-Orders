// =============================================================================
// Page Administration (admin uniquement)
//  - Catalogue : créer, modifier, supprimer des articles + insérer la démo
//  - Utilisateurs : liste et changement de rôle
// =============================================================================

import {
  db, collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, writeBatch, serverTimestamp,
} from "../firebase.js";
import { requireAuth, ROLES } from "../auth.js";
import { DEMO_PRODUCTS } from "../seed-data.js";
import { escapeHtml, formatDate, formatPrice, toast, errorMessage, ROLE_LABELS } from "../utils.js";

const { profile } = await requireAuth(["admin"]);

// -----------------------------------------------------------------------------
// Onglets Catalogue / Utilisateurs
// -----------------------------------------------------------------------------
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    document.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== tab.dataset.tab;
    });
  });
});

// =============================================================================
// CATALOGUE
// =============================================================================
const productForm = document.querySelector("#product-form");
// form.elements.xxx et non form.xxx : « name » est déjà une propriété du <form>
const fields = productForm.elements;
const formTitle = document.querySelector("#form-title");
const cancelEditBtn = document.querySelector("#cancel-edit");
const productsBody = document.querySelector("#products");
const productSearch = document.querySelector("#product-search");

let products = [];
let editingId = null; // null = création, sinon id du produit en cours de modification

// Écoute en temps réel du catalogue
onSnapshot(
  collection(db, "products"),
  (snapshot) => {
    products = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    renderProducts();
    renderCategoryList();
  },
  (error) => toast(errorMessage(error), "error")
);

function renderProducts() {
  const search = productSearch.value.trim().toLowerCase();
  const visible = products.filter((p) =>
    !search || `${p.name} ${p.category}`.toLowerCase().includes(search));

  if (visible.length === 0) {
    productsBody.innerHTML = `<tr><td colspan="5" class="empty">
      ${products.length ? "Aucun article trouvé." : "Catalogue vide : ajoutez un article ou insérez la démo."}
    </td></tr>`;
    return;
  }

  productsBody.innerHTML = visible.map((p) => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td><span class="badge badge-category">${escapeHtml(p.category)}</span></td>
      <td class="num">${formatPrice(p.price)}</td>
      <td>${p.available ? "Oui" : '<span class="badge badge-rejected">Non</span>'}</td>
      <td>
        <div class="cell-actions">
          <button class="btn btn-small btn-secondary" data-edit="${p.id}">Modifier</button>
          <button class="btn btn-small btn-danger" data-delete="${p.id}">Supprimer</button>
        </div>
      </td>
    </tr>`).join("");
}

/** Remplit la liste de suggestions du champ « Catégorie ». */
function renderCategoryList() {
  const categories = [...new Set(products.map((p) => p.category))].sort();
  document.querySelector("#categories").innerHTML =
    categories.map((c) => `<option value="${escapeHtml(c)}">`).join("");
}

productSearch.addEventListener("input", renderProducts);

// --- Passage en mode « modification » / retour en mode « création » ---
function startEdit(product) {
  editingId = product.id;
  fields.name.value = product.name;
  fields.category.value = product.category;
  fields.price.value = product.price;
  fields.supplierUrl.value = product.supplierUrl ?? "";
  fields.description.value = product.description ?? "";
  fields.available.checked = product.available;
  formTitle.textContent = `Modifier « ${product.name} »`;
  cancelEditBtn.hidden = false;
  productForm.scrollIntoView({ behavior: "smooth" });
}

function resetForm() {
  editingId = null;
  productForm.reset();
  formTitle.textContent = "Ajouter un article";
  cancelEditBtn.hidden = true;
}

cancelEditBtn.addEventListener("click", resetForm);

// --- Enregistrement (création ou modification) ---
productForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = {
    name: fields.name.value.trim(),
    category: fields.category.value.trim(),
    price: Math.round(parseFloat(fields.price.value) * 100) / 100,
    supplierUrl: fields.supplierUrl.value.trim(),
    description: fields.description.value.trim(),
    available: fields.available.checked,
    updatedAt: serverTimestamp(),
  };

  if (!data.name || !data.category || !(data.price >= 0)) {
    toast("Nom, catégorie et prix (positif) sont obligatoires.", "error");
    return;
  }

  try {
    if (editingId) {
      await updateDoc(doc(db, "products", editingId), data);
      toast("Article modifié.", "success");
    } else {
      await addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp() });
      toast("Article ajouté.", "success");
    }
    resetForm();
  } catch (error) {
    toast(errorMessage(error), "error");
  }
});

// --- Boutons Modifier / Supprimer du tableau ---
productsBody.addEventListener("click", async (event) => {
  const editBtn = event.target.closest("[data-edit]");
  const deleteBtn = event.target.closest("[data-delete]");

  if (editBtn) {
    startEdit(products.find((p) => p.id === editBtn.dataset.edit));
  }

  if (deleteBtn) {
    const product = products.find((p) => p.id === deleteBtn.dataset.delete);
    // Les commandes existantes ne sont pas touchées : elles contiennent une copie des articles
    if (!confirm(`Supprimer « ${product.name} » du catalogue ?`)) return;
    try {
      await deleteDoc(doc(db, "products", product.id));
      if (editingId === product.id) resetForm();
      toast("Article supprimé.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }
});

// --- Insertion des produits de démo, en une seule opération groupée (batch) ---
document.querySelector("#seed-btn").addEventListener("click", async (event) => {
  const message = products.length
    ? `Le catalogue contient déjà ${products.length} article(s). Ajouter quand même les ${DEMO_PRODUCTS.length} produits de démo ?`
    : `Insérer ${DEMO_PRODUCTS.length} produits de démo ?`;
  if (!confirm(message)) return;

  event.target.disabled = true;
  try {
    const batch = writeBatch(db);
    for (const product of DEMO_PRODUCTS) {
      const ref = doc(collection(db, "products")); // nouvel identifiant automatique
      batch.set(ref, { ...product, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    await batch.commit(); // tout est écrit, ou rien
    toast("Produits de démo insérés.", "success");
  } catch (error) {
    toast(errorMessage(error), "error");
  } finally {
    event.target.disabled = false;
  }
});

// =============================================================================
// UTILISATEURS
// =============================================================================
const usersBody = document.querySelector("#users");
const userSearch = document.querySelector("#user-search");
let users = [];

onSnapshot(
  collection(db, "users"),
  (snapshot) => {
    users = snapshot.docs
      .map((d) => ({ uid: d.id, ...d.data() }))
      .sort((a, b) => a.email.localeCompare(b.email));
    renderUsers();
  },
  (error) => toast(errorMessage(error), "error")
);

function renderUsers() {
  const search = userSearch.value.trim().toLowerCase();
  const visible = users.filter((u) =>
    !search || `${u.displayName} ${u.email}`.toLowerCase().includes(search));

  usersBody.innerHTML = visible.map((u) => {
    const isMe = u.uid === profile.uid;
    const options = ROLES.map((role) =>
      `<option value="${role}" ${role === u.role ? "selected" : ""}>${ROLE_LABELS[role]}</option>`).join("");

    return `
      <tr>
        <td>${escapeHtml(u.displayName)} ${isMe ? '<span class="hint">(vous)</span>' : ""}</td>
        <td>${escapeHtml(u.email)}</td>
        <td><select data-uid="${u.uid}" ${isMe ? "disabled" : ""} aria-label="Rôle">${options}</select></td>
        <td>${formatDate(u.createdAt)}</td>
      </tr>`;
  }).join("") || `<tr><td colspan="4" class="empty">Aucun utilisateur trouvé.</td></tr>`;
}

userSearch.addEventListener("input", renderUsers);

// Changement de rôle
usersBody.addEventListener("change", async (event) => {
  const select = event.target.closest("select[data-uid]");
  if (!select) return;

  const target = users.find((u) => u.uid === select.dataset.uid);
  const newRole = select.value;

  if (!confirm(`Passer ${target.email} en « ${ROLE_LABELS[newRole]} » ?`)) {
    select.value = target.role; // on remet l'ancienne valeur
    return;
  }

  try {
    // On ne modifie QUE le champ role : les règles refusent tout autre champ
    await updateDoc(doc(db, "users", target.uid), { role: newRole });
    toast(`${target.email} est maintenant ${ROLE_LABELS[newRole]}.`, "success");
  } catch (error) {
    select.value = target.role;
    toast(errorMessage(error), "error");
  }
});
