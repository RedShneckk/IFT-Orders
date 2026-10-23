// =============================================================================
// Initialisation de Firebase (un seul endroit pour tout le site)
// -----------------------------------------------------------------------------
// Le SDK est chargé directement depuis le CDN de Google (gstatic) sous forme de
// modules ES : pas de npm, pas de bundler, le site reste 100 % statique.
//
// Ce fichier ré-exporte les fonctions du SDK utilisées ailleurs. Les autres
// fichiers importent donc depuis "./firebase.js" et la version du SDK n'est
// écrite qu'ici (pour la mettre à jour, il suffit de remplacer « 10.12.2 »
// dans les URL de ce fichier).
// =============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Application Firebase + services utilisés
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- Fonctions d'authentification utilisées dans le site ---
export {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// --- Fonctions Firestore utilisées dans le site ---
export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
