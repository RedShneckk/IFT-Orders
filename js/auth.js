// =============================================================================
// Authentification : profil utilisateur, garde de page, déconnexion
// -----------------------------------------------------------------------------
// RAPPEL IMPORTANT : tout ce qui est fait ici (redirections, masquage de menus)
// ne sert qu'à l'AFFICHAGE. Un utilisateur malin peut contourner n'importe quel
// code JavaScript dans son navigateur. La vraie protection des données, ce sont
// les règles Firestore (firestore.rules), appliquées par les serveurs Google.
// =============================================================================

import {
  auth, db, onAuthStateChanged, signOut,
  doc, getDoc, setDoc, serverTimestamp,
} from "./firebase.js";
import { renderLayout } from "./layout.js";

export const ROLES = ["student", "staff", "admin"];

/** Page d'accueil selon le rôle : catalogue pour un étudiant, tableau de bord sinon. */
export function homeFor(role) {
  return role === "student" ? "catalogue.html" : "staff.html";
}

/**
 * Lit le profil `users/{uid}` de l'utilisateur connecté.
 * S'il n'existe pas encore (première connexion, ou inscription interrompue),
 * on le crée avec le rôle "student" : c'est le SEUL rôle que les règles
 * autorisent à la création.
 */
export async function getOrCreateProfile(user, displayName = "") {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { uid: user.uid, ...snap.data() };
  }

  const profile = {
    email: user.email,
    // 60 caractères max : même limite que dans firestore.rules
    displayName: (displayName || user.displayName || user.email.split("@")[0]).slice(0, 60),
    role: "student",
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return { uid: user.uid, ...profile };
}

/**
 * Garde de page : à appeler en haut de chaque page protégée.
 *
 *   const { user, profile } = await requireAuth(["staff", "admin"]);
 *
 * - pas connecté          -> redirection vers index.html (connexion)
 * - rôle non autorisé     -> redirection vers la page d'accueil de son rôle
 * - sinon                 -> affiche l'en-tête/menu et renvoie l'utilisateur + son profil
 */
export function requireAuth(allowedRoles = ROLES) {
  return new Promise((resolve) => {
    // onAuthStateChanged est appelé dès que Firebase sait si quelqu'un est
    // connecté (la session est conservée entre deux visites).
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe(); // on n'a besoin que de la première réponse

      if (!user) {
        location.replace("index.html");
        return;
      }

      try {
        const profile = await getOrCreateProfile(user);
        if (!allowedRoles.includes(profile.role)) {
          location.replace(homeFor(profile.role));
          return;
        }
        renderLayout(profile);
        document.body.classList.remove("loading");
        resolve({ user, profile });
      } catch (error) {
        console.error(error);
        document.body.classList.remove("loading");
        document.querySelector("main").innerHTML =
          `<p class="alert alert-error">Impossible de charger votre profil.
           Vérifiez la configuration Firebase et les règles Firestore.</p>`;
      }
    });
  });
}

/** Déconnexion : on vide aussi le panier local puis on retourne à l'accueil. */
export async function logout() {
  try {
    localStorage.removeItem("ift-cart");
  } catch {
    // localStorage indisponible (navigation privée...) : rien à vider
  }
  await signOut(auth);
  location.replace("index.html");
}
