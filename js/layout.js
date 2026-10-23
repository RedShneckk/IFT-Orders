// =============================================================================
// Mise en page commune : en-tête, menu adapté au rôle, pied de page
// -----------------------------------------------------------------------------
// Chaque page HTML contient simplement :
//   <header class="topbar"></header>  <main>...</main>  <footer class="footer"></footer>
// et ce module remplit l'en-tête et le pied de page.
// =============================================================================

import { escapeHtml, ROLE_LABELS } from "./utils.js";

// Liens du menu, et rôles qui peuvent les voir
const NAV_LINKS = [
  { href: "catalogue.html", label: "Catalogue",       roles: ["student", "staff", "admin"] },
  { href: "panier.html",    label: "Panier",          roles: ["student"], id: "nav-cart" },
  { href: "commandes.html", label: "Mes commandes",   roles: ["student"] },
  { href: "staff.html",     label: "Tableau de bord", roles: ["staff", "admin"] },
  { href: "admin.html",     label: "Administration",  roles: ["admin"] },
];

export function renderLayout(profile) {
  // Nom du fichier de la page courante, pour surligner le lien actif
  const currentPage = location.pathname.split("/").pop() || "index.html";

  const links = NAV_LINKS
    .filter((link) => link.roles.includes(profile.role))
    .map((link) => `
      <a href="${link.href}" ${link.id ? `id="${link.id}"` : ""}
         class="${link.href === currentPage ? "active" : ""}">${link.label}</a>`)
    .join("");

  const header = document.querySelector(".topbar");
  header.innerHTML = `
    <button class="burger" aria-label="Ouvrir le menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
    <a class="logo" href="${profile.role === "student" ? "catalogue.html" : "staff.html"}">
      <span class="logo-mark">V</span>IFT
    </a>
    <nav class="nav">${links}</nav>
    <div class="user-box">
      <span class="user-email">${escapeHtml(profile.email)}</span>
      <span class="badge badge-role">${ROLE_LABELS[profile.role] ?? profile.role}</span>
      <button class="btn" id="logout-btn">Déconnexion</button>
    </div>`;

  // Menu burger (visible uniquement sur petit écran grâce au CSS)
  const burger = header.querySelector(".burger");
  burger.addEventListener("click", () => {
    const open = header.classList.toggle("nav-open");
    burger.setAttribute("aria-expanded", String(open));
  });

  // Import dynamique pour éviter une dépendance circulaire auth.js <-> layout.js
  header.querySelector("#logout-btn").addEventListener("click", async () => {
    const { logout } = await import("./auth.js");
    logout();
  });

  renderFooter();
}

export function renderFooter() {
  const footer = document.querySelector(".footer");
  if (footer) {
    footer.textContent = `IFT © ${new Date().getFullYear()} · Exercice ESILV (version étudiante)`;
  }
}
