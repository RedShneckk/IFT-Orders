// =============================================================================
// Page de connexion (index.html) : connexion, inscription, mot de passe oublié
// =============================================================================

import {
  auth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, updateProfile,
} from "../firebase.js";
import { getOrCreateProfile, homeFor } from "../auth.js";
import { renderFooter } from "../layout.js";
import { errorMessage } from "../utils.js";

const message = document.querySelector("#message");
const loginForm = document.querySelector("#login-form");
const signupForm = document.querySelector("#signup-form");
const resetForm = document.querySelector("#reset-form");

renderFooter();

// -----------------------------------------------------------------------------
// Si l'utilisateur est déjà connecté, on l'envoie directement sur sa page
// -----------------------------------------------------------------------------
const unsubscribe = onAuthStateChanged(auth, async (user) => {
  unsubscribe(); // on ne regarde que l'état initial
  if (user) {
    await goHome(user);
  } else {
    document.body.classList.remove("loading");
  }
});

async function goHome(user, displayName) {
  try {
    const profile = await getOrCreateProfile(user, displayName);
    location.replace(homeFor(profile.role));
  } catch (error) {
    document.body.classList.remove("loading");
    showMessage(errorMessage(error), "error");
  }
}

// -----------------------------------------------------------------------------
// Affichage : onglets et messages
// -----------------------------------------------------------------------------
function showPanel(name) {
  document.querySelectorAll("[data-panel]").forEach((form) => {
    form.hidden = form.dataset.panel !== name;
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === name);
  });
  hideMessage();
}

// Tous les boutons ayant un attribut data-tab changent de panneau
document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => showPanel(button.dataset.tab));
});

function showMessage(text, type) {
  message.textContent = text;
  message.className = `alert alert-${type}`;
  message.hidden = false;
}

function hideMessage() {
  message.hidden = true;
}

/** Désactive le bouton d'un formulaire pendant une requête (évite les doubles clics). */
function setBusy(form, busy) {
  form.querySelector("button[type=submit]").disabled = busy;
}

// -----------------------------------------------------------------------------
// Connexion
// -----------------------------------------------------------------------------
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault(); // pas de rechargement de la page
  hideMessage();
  setBusy(loginForm, true);

  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;

  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    await goHome(user);
  } catch (error) {
    showMessage(errorMessage(error), "error");
  } finally {
    setBusy(loginForm, false);
  }
});

// -----------------------------------------------------------------------------
// Inscription : création du compte Auth puis du profil Firestore (rôle student)
// -----------------------------------------------------------------------------
signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage();
  setBusy(signupForm, true);

  const displayName = signupForm.displayName.value.trim();
  const email = signupForm.email.value.trim();
  const password = signupForm.password.value;

  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName }); // nom stocké aussi dans Firebase Auth
    await goHome(user, displayName);            // crée users/{uid} avec role = "student"
  } catch (error) {
    showMessage(errorMessage(error), "error");
  } finally {
    setBusy(signupForm, false);
  }
});

// -----------------------------------------------------------------------------
// Mot de passe oublié : Firebase envoie lui-même l'e-mail de réinitialisation
// -----------------------------------------------------------------------------
resetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage();
  setBusy(resetForm, true);

  try {
    await sendPasswordResetEmail(auth, resetForm.email.value.trim());
    // Message volontairement neutre : on ne révèle pas si le compte existe
    showMessage("Si un compte existe pour cette adresse, un e-mail vient d'être envoyé (pensez aux spams).", "success");
  } catch (error) {
    showMessage(errorMessage(error), "error");
  } finally {
    setBusy(resetForm, false);
  }
});
