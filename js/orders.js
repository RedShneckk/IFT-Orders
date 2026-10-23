// =============================================================================
// Logique des commandes, partagée par les pages étudiant et staff
// -----------------------------------------------------------------------------
// Cycle de vie d'une commande :
//
//   pending ──► accepted ──► ordered ──► delivered
//      │
//      ├──► rejected   (staff/admin, commentaire obligatoire)
//      └──► cancelled  (l'étudiant, tant que la commande est en attente)
//
// Les mêmes transitions sont imposées par firestore.rules : ce fichier sert à
// n'afficher que les boutons utiles, les règles empêchent la triche.
// =============================================================================

import {
  db, collection, doc, addDoc, updateDoc,
  arrayUnion, serverTimestamp, Timestamp,
} from "./firebase.js";
import { askComment, toast, errorMessage, STATUSES } from "./utils.js";

/**
 * Transitions possibles depuis chaque statut.
 * - owner : ce que peut faire l'auteur de la commande
 * - staff : ce que peuvent faire les rôles staff et admin
 */
export const TRANSITIONS = {
  pending:  { owner: ["cancelled"], staff: ["accepted", "rejected"] },
  accepted: { owner: [],            staff: ["ordered"] },
  ordered:  { owner: [],            staff: ["delivered"] },
  // rejected, delivered, cancelled : statuts finaux, plus aucune transition
};

/** Texte des boutons d'action pour chaque statut cible. */
export const ACTION_LABELS = {
  accepted: "Accepter",
  rejected: "Refuser",
  ordered: "Marquer commandée",
  delivered: "Marquer livrée",
  cancelled: "Annuler la commande",
};

/** Liste des statuts vers lesquels l'utilisateur courant peut faire passer la commande. */
export function nextStatuses(order, profile) {
  const rule = TRANSITIONS[order.status];
  if (!rule) return [];

  const result = [];
  if (order.userId === profile.uid) result.push(...rule.owner);
  if (profile.role === "staff" || profile.role === "admin") result.push(...rule.staff);
  return result;
}

/**
 * Crée une entrée d'historique.
 * On ne peut pas utiliser serverTimestamp() à l'intérieur d'un tableau
 * (limitation de Firestore), d'où Timestamp.now() (heure de l'ordinateur) ;
 * les règles vérifient que cette heure est proche de l'heure du serveur.
 */
function historyEntry(status, user, comment = "") {
  return {
    status,
    by: user.uid,
    byEmail: user.email,
    comment,
    at: Timestamp.now(),
  };
}

/**
 * Crée une commande « pending » à partir du panier.
 * Les articles sont copiés (nom, prix...) : si le catalogue change plus tard,
 * la commande garde les informations du moment où elle a été passée.
 * Renvoie l'identifiant de la nouvelle commande.
 */
export async function createOrder({ user, profile, cart, title, justification }) {
  const items = cart.map(({ productId, name, category, price, quantity }) =>
    ({ productId, name, category, price, quantity }));
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const ref = await addDoc(collection(db, "orders"), {
    userId: user.uid,
    userEmail: user.email,
    userName: profile.displayName ?? "",
    title,
    justification,
    items,
    total: Math.round(total * 100) / 100,
    status: "pending",
    history: [historyEntry("pending", user)],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Change le statut d'une commande et ajoute une ligne à l'historique.
 * arrayUnion ajoute l'entrée à la fin du tableau sans réécrire les anciennes.
 */
export function changeStatus(orderId, newStatus, user, comment = "") {
  return updateDoc(doc(db, "orders", orderId), {
    status: newStatus,
    history: arrayUnion(historyEntry(newStatus, user, comment)),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Action complète déclenchée par un bouton : demande un commentaire
 * (obligatoire pour un refus), enregistre le changement puis affiche un message.
 * Utilisée par la page de détail et par le tableau de bord staff.
 */
export async function runStatusAction(order, newStatus, user) {
  const comment = await askComment({
    title: `${ACTION_LABELS[newStatus]} : « ${order.title} »`,
    label: newStatus === "rejected" ? "Motif du refus" : "Commentaire",
    required: newStatus === "rejected",
    confirmText: ACTION_LABELS[newStatus],
  });
  if (comment === null) return; // l'utilisateur a cliqué sur « Annuler »

  try {
    await changeStatus(order.id, newStatus, user, comment);
    toast(`Commande « ${order.title} » : ${STATUSES[newStatus].label.toLowerCase()}.`, "success");
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}
