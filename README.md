# Commandes IFT : version étudiante

🔗 **Site en ligne : <https://redshneckk.github.io/IFT-Orders/>**

Ce site permet de commander du matériel pour des projets. C'est une version simplifiée du site de commande de
l'IFT (Institute of Future Technology, ESILV), réalisée comme exercice du cours de technologies web.

- **Front** : HTML, CSS et JavaScript « vanilla » en modules ES, sans framework ni étape de build.
- **Back-end** : Firebase uniquement. **Firebase Authentication** gère les comptes et **Cloud Firestore** sert de
  base de données. Les **règles de sécurité Firestore** jouent le rôle du serveur. Le site reste sur le plan gratuit
  Spark, sans Cloud Functions.
- **Hébergement** : GitHub Pages (site 100 % statique).

---

## Sommaire

1. [Fonctionnalités et rôles](#1-fonctionnalités-et-rôles)
2. [Structure des fichiers](#2-structure-des-fichiers)
3. [Modèle de données Firestore](#3-modèle-de-données-firestore)
4. [Créer et configurer le projet Firebase](#4-créer-et-configurer-le-projet-firebase)
5. [Lancer le site en local](#5-lancer-le-site-en-local)
6. [Créer le premier admin](#6-créer-le-premier-admin)
7. [Déployer sur GitHub Pages](#7-déployer-sur-github-pages)
8. [Comptes de test et scénario de démo](#8-comptes-de-test-et-scénario-de-démo)
9. [La sécurité : comment fonctionnent les règles](#9-la-sécurité--comment-fonctionnent-les-règles)
10. [Vérifier que les règles protègent bien](#10-vérifier-que-les-règles-protègent-bien)
11. [Limites connues](#11-limites-connues)

---

## 1. Fonctionnalités et rôles

| Rôle | Ce qu'il peut faire |
|---|---|
| `student` (rôle par défaut à l'inscription) | Consulter le catalogue, remplir un panier, passer une commande avec une justification, voir **ses** commandes et annuler une commande encore « en attente ». |
| `staff` (profs, responsables IFT) | Voir **toutes** les commandes, les accepter ou les refuser avec un commentaire, puis les passer en « commandée » et « livrée ». |
| `admin` | Tout ce que fait le staff, plus la gestion du catalogue (ajout, modification, suppression) et l'attribution des rôles. |

Il peut y avoir plusieurs comptes staff et plusieurs admins.

**Cycle de vie d'une commande :**

```
pending (en attente) ──► accepted (acceptée) ──► ordered (commandée) ──► delivered (livrée)
   │
   ├──► rejected (refusée)   par le staff ou un admin, avec un commentaire obligatoire
   └──► cancelled (annulée)  par l'étudiant, tant que la commande est en attente
```

Chaque changement de statut est ajouté à l'**historique** de la commande, avec la date, l'auteur et le commentaire.

## 2. Structure des fichiers

```
├── index.html            Connexion, inscription et mot de passe oublié
├── catalogue.html        Catalogue : recherche, filtre par catégorie, ajout au panier
├── panier.html           Panier, titre et justification, validation de la commande
├── commandes.html        « Mes commandes » (étudiant)
├── commande.html         Détail d'une commande (?id=...) : articles, historique, actions
├── staff.html            Tableau de bord staff/admin : toutes les commandes
├── admin.html            Administration : catalogue, rôles, produits de démo
├── css/style.css         Feuille de style unique (responsive)
├── js/
│   ├── firebase-config.js   ⚠️ Configuration de TON projet Firebase (à remplir)
│   ├── firebase.js          Initialisation de Firebase et import du SDK depuis le CDN
│   ├── auth.js              Garde de page (rôle requis), profil et déconnexion
│   ├── layout.js            En-tête, menu selon le rôle et pied de page
│   ├── utils.js             Échappement HTML, dates, prix, statuts, notifications
│   ├── cart.js              Panier stocké dans le navigateur (localStorage)
│   ├── orders.js            Création de commande et transitions de statut
│   ├── seed-data.js         Produits de démonstration
│   └── pages/               Un script par page HTML
├── firestore.rules       Règles de sécurité Firestore (le vrai back-end)
├── firebase.json         Facultatif : permet de publier les règles avec la CLI Firebase
└── .nojekyll             Indique à GitHub Pages de servir les fichiers tels quels
```

Chaque page HTML charge son script avec `<script type="module" src="js/pages/xxx.js">`. Ce script commence par
`await requireAuth([...rôles autorisés])`. Si l'utilisateur n'est pas connecté, il est renvoyé vers la page de
connexion. S'il n'a pas le bon rôle, il est renvoyé vers sa page d'accueil.

## 3. Modèle de données Firestore

```
users/{uid}                     uid = identifiant Firebase Auth
  email, displayName            string
  role                          "student" | "staff" | "admin"
  createdAt                     timestamp

products/{id}
  name, description, category   string
  price                         number (prix indicatif, en €)
  supplierUrl                   string ("" si aucun lien)
  available                     boolean
  createdAt, updatedAt          timestamp

orders/{id}
  userId, userEmail, userName   auteur de la commande
  title, justification          string
  items                         [{ productId, name, category, price, quantity }]
  total                         number (indicatif)
  status                        "pending" | "accepted" | "rejected" | "ordered" | "delivered" | "cancelled"
  history                       [{ status, by, byEmail, comment, at }]
  createdAt, updatedAt          timestamp
```

**Pourquoi copier les articles dans la commande ?** Si un admin modifie le prix d'un produit ou le supprime, les
commandes déjà passées gardent les informations du moment où elles ont été faites.

**Aucun index composite n'est nécessaire.** Les tris et les filtres par statut se font dans le navigateur.

---

## 4. Créer et configurer le projet Firebase

### 4.1 Créer le projet
1. Ouvrir la [console Firebase](https://console.firebase.google.com/) et cliquer sur **Créer un projet**.
2. Donner un nom au projet (par exemple `commandes-ift`). Google Analytics n'est pas nécessaire : tu peux le
   désactiver.

### 4.2 Déclarer l'application Web et récupérer la configuration
1. Sur la page d'accueil du projet, cliquer sur l'icône **Web** (`</>`).
2. Donner un surnom à l'application. Ne pas cocher « Firebase Hosting », puisque le site est hébergé sur GitHub Pages.
3. Firebase affiche un objet `firebaseConfig = { apiKey: ..., authDomain: ..., ... }`.
   Copier ces valeurs dans **`js/firebase-config.js`**, à la place des `A_REMPLACER`.

> Ces valeurs ne sont pas secrètes. Elles identifient le projet et sont visibles par tous les visiteurs du site.
> Ce sont les règles Firestore qui protègent les données, pas la clé.

Pour retrouver la configuration plus tard : **Paramètres du projet** (roue dentée) > **Général** > **Vos applications**.

### 4.3 Activer l'authentification par e-mail et mot de passe
1. Menu **Build** > **Authentication** > **Commencer**.
2. Onglet **Sign-in method** : choisir **E-mail/Mot de passe**, activer le premier interrupteur et cliquer sur
   **Enregistrer**.
3. Facultatif : dans l'onglet **Modèles**, choisir le français pour la langue de l'e-mail « réinitialisation du
   mot de passe ».

### 4.4 Créer la base Cloud Firestore
1. Menu **Build** > **Firestore Database** > **Créer une base de données**.
2. Choisir un emplacement en Europe (par exemple `eur3 (europe-west)`). Ce choix est définitif.
3. Choisir **Démarrer en mode production**. Tout est alors refusé tant que nos règles ne sont pas publiées.

### 4.5 Publier les règles de sécurité
1. Dans **Firestore Database**, ouvrir l'onglet **Règles**.
2. Remplacer tout le contenu par celui du fichier **`firestore.rules`**.
3. Cliquer sur **Publier**.

> Variante avec la ligne de commande (facultatif) : `npm i -g firebase-tools`, `firebase login`,
> `firebase use --add` puis `firebase deploy --only firestore:rules` (le fichier `firebase.json` est déjà prêt).

À chaque modification de `firestore.rules`, il faut le republier.

---

## 5. Lancer le site en local

Les modules ES ne fonctionnent pas si on ouvre le fichier directement (`file://...`) : il faut un petit
serveur web. Depuis le dossier du projet :

```bash
python -m http.server 8000
```

Ouvrir ensuite <http://localhost:8000>. Avec Node.js, `npx serve` fonctionne aussi.

`localhost` fait déjà partie des domaines autorisés de Firebase Auth : il n'y a rien à configurer pour tester en local.

---

## 6. Créer le premier admin

Les règles empêchent quiconque de se donner un rôle depuis le site. Le premier admin se crée donc **à la main**
dans la console Firebase, qui n'est pas soumise aux règles.

1. Sur le site, **créer un compte normalement** (onglet « Inscription »), par exemple `admin@test.fr`.
   Ce compte est créé avec le rôle `student`.
2. Dans la console Firebase, ouvrir **Firestore Database** > onglet **Données** > collection **`users`**.
3. Repérer le document de ce compte : son identifiant est l'UID, et on le reconnaît à son champ `email`.
   L'UID est aussi visible dans **Authentication** > **Users**.
4. Cliquer sur le champ **`role`**, puis sur le crayon, remplacer `student` par **`admin`** et cliquer sur
   **Mettre à jour**.
5. Sur le site, se **déconnecter puis se reconnecter** : le menu « Administration » apparaît.

Ensuite, tout se fait depuis le site. Dans **Administration** > **Utilisateurs**, l'admin peut passer d'autres
comptes en `staff` ou en `admin`. Un admin ne peut pas modifier **son propre** rôle, ce qui évite de supprimer
le dernier admin par erreur. Pour retirer un admin, un autre admin doit s'en charger.

---

## 7. Déployer sur GitHub Pages

1. Créer un dépôt sur GitHub, par exemple `commandes-ift`, public, sans README.
2. Pousser le code :
   ```bash
   git remote add origin https://github.com/<mon-pseudo>/commandes-ift.git
   git push -u origin main
   ```
3. Sur GitHub, dans le dépôt, aller dans **Settings** > **Pages**. Dans **Build and deployment**, choisir
   **Source : Deploy from a branch**, puis **Branch : `main`** et le dossier **`/ (root)`**, et cliquer sur
   **Save**.
4. Au bout d'une à deux minutes, le site est en ligne à l'adresse
   `https://<mon-pseudo>.github.io/commandes-ift/`.

### Autoriser le domaine GitHub Pages dans Firebase Auth (recommandé)
Firebase Auth tient une liste de **domaines autorisés**. Elle sert à deux choses :
- la connexion par un fournisseur externe (Google, GitHub…), en pop-up ou par redirection ;
- les liens envoyés par e-mail qui renvoient vers le site (paramètre `continueUrl`).

La connexion par **e-mail et mot de passe** n'est pas concernée : le site fonctionne même sans cette étape.
Ajouter le domaine reste une bonne pratique, et devient obligatoire dès qu'on ajoute par exemple
« Se connecter avec Google ». Sinon, on obtient l'erreur `auth/unauthorized-domain`.

1. Dans la console Firebase, aller dans **Authentication** > onglet **Settings** (Paramètres) >
   **Domaines autorisés**.
2. Cliquer sur **Ajouter un domaine** et saisir **`<mon-pseudo>.github.io`**. Il faut seulement le domaine,
   sans `https://` ni le nom du dépôt.

---

## 8. Comptes de test et scénario de démo

Comptes suggérés, tous avec le mot de passe `Test1234!` :

| Compte | Rôle | Comment l'obtenir |
|---|---|---|
| `etudiant@test.fr` | student | Inscription sur le site |
| `staff@test.fr` | staff | Inscription, puis l'admin lui donne le rôle Staff dans Administration > Utilisateurs |
| `admin@test.fr` | admin | Inscription, puis modification à la main dans la console (voir la section 6) |

> Ces adresses n'existent pas : le lien « mot de passe oublié » ne pourra pas leur parvenir. Pour tester
> cette fonction, utilise une vraie adresse.

**Scénario de démonstration :**
1. **admin** : Administration > Catalogue > **Insérer les produits de démo**, puis Utilisateurs > passer
   `staff@test.fr` en Staff.
2. **etudiant** : Catalogue > ajouter deux ou trois articles > Panier > saisir un titre et une justification >
   **Valider**. La commande apparaît « En attente ».
3. **etudiant** : passer une deuxième commande, puis l'**annuler** depuis sa page de détail.
4. **staff** : Tableau de bord. La première commande apparaît sans recharger la page (temps réel).
   **Accepter** avec un commentaire, puis **Marquer commandée**, puis **Marquer livrée**.
5. **etudiant** : la page de détail affiche l'historique complet, avec les dates, les auteurs et les commentaires.
6. Pour tester le refus, faire une troisième commande et la **refuser** : le motif est obligatoire.

---

## 9. La sécurité : comment fonctionnent les règles

Le site est statique : tout le JavaScript s'exécute dans le navigateur, et n'importe qui peut le modifier
avec les outils de développement (F12). Les redirections et les menus masqués selon le rôle ne sont donc
**qu'un confort d'affichage**. La protection repose entièrement sur `firestore.rules`, que les serveurs de
Google évaluent à chaque lecture et à chaque écriture.

Points clés du fichier `firestore.rules` :

- **Le rôle est lu dans la base**, et non dans le navigateur. La fonction `myRole()` fait un
  `get(/users/{uid})` côté serveur.
- **`users`** :
  - un utilisateur ne peut créer **que son propre** profil, **obligatoirement** avec `role == "student"`
    et avec son vrai e-mail ;
  - il ne peut modifier que son `displayName` (`diff().affectedKeys().hasOnly(['displayName'])`), donc
    jamais son rôle ;
  - seul un admin peut modifier le champ `role` d'un **autre** utilisateur.
- **`products`** : lecture pour les utilisateurs connectés, écriture réservée aux admins. Les types sont
  vérifiés : prix positif, lien en `http(s)://`, etc.
- **`orders`** :
  - **Lecture** : l'auteur, le staff ou un admin. La requête d'un étudiant doit filtrer sur
    `where("userId", "==", uid)`, sinon Firestore la refuse : **une règle n'est pas un filtre**.
  - **Création** : `userId` doit être l'uid de l'auteur, le statut doit être `pending`, et l'historique doit
    contenir exactement une entrée signée par l'auteur.
  - **Mise à jour** : seuls `status`, `history` et `updatedAt` peuvent changer.
  - La **transition** doit être autorisée pour le rôle : l'auteur peut passer de `pending` à `cancelled` ;
    le staff peut passer de `pending` à `accepted` ou `rejected`, d'`accepted` à `ordered`, et d'`ordered` à
    `delivered`.
  - L'historique doit être l'ancien historique **sans modification**, plus **une seule** nouvelle entrée,
    signée par l'utilisateur connecté et datée de maintenant. Pour le vérifier, on compare l'ancien tableau
    au début du nouveau : `history[0:n] == ancien`.
  - Un refus sans commentaire est rejeté.
  - Les commandes ne sont jamais supprimées : on les annule ou on les refuse.

Côté affichage, tout texte saisi par un utilisateur est échappé avec `escapeHtml()` avant d'être inséré dans
la page. Cela empêche l'injection de code (XSS) via un nom de produit ou une justification.

---

## 10. Vérifier que les règles protègent bien

Se connecter **en étudiant** sur le site, ouvrir la console du navigateur (F12 > Console) et coller :

```js
const fb = await import("./js/firebase.js");
const { db, auth, doc, collection, getDocs, addDoc, updateDoc } = fb;

// 1. Se donner le rôle admin : doit échouer
await updateDoc(doc(db, "users", auth.currentUser.uid), { role: "admin" });

// 2. Lire toutes les commandes : doit échouer
await getDocs(collection(db, "orders"));

// 3. Créer une commande directement « acceptée » : doit échouer
await addDoc(collection(db, "orders"), { userId: auth.currentUser.uid, status: "accepted" });

// 4. Modifier un produit (copier un id depuis la console Firebase) : doit échouer
await updateDoc(doc(db, "products", "ID_D_UN_PRODUIT"), { price: 0 });
```

Chaque ligne doit afficher l'erreur **`FirebaseError: Missing or insufficient permissions`**.

On peut aussi simuler des requêtes sans écrire de code dans **Firestore Database** > **Règles** >
**Terrain de jeu des règles** (*Rules Playground*). Il suffit de choisir une opération, un chemin et un
utilisateur authentifié.

---

## 11. Limites connues

Ces simplifications sont assumées pour un exercice de cours :

- **Contenu de `items` non vérifié article par article** : le langage des règles n'a pas de boucles. On vérifie
  seulement que `items` est une liste de 1 à 50 éléments. Le `total` est donc **indicatif** : le staff contrôle
  les prix réels avant de commander.
- **Horodatage de l'historique** : `serverTimestamp()` est interdit dans un tableau. La date de chaque entrée
  vient donc de l'ordinateur de l'utilisateur. Les règles tolèrent un écart de 10 minutes avec l'heure du
  serveur. Les champs `createdAt` et `updatedAt`, eux, sont des dates serveur.
- **Coût en lectures** : chaque `isStaff()` ou `isAdmin()` effectue un `get()` facturé comme une lecture. Ça
  reste négligeable avec le quota gratuit du plan Spark (50 000 lectures par jour).
- **Filtres côté client** : le staff charge toutes les commandes puis filtre dans le navigateur. Avec des
  milliers de commandes, il faudrait passer à des requêtes Firestore filtrées, à des index composites et à
  de la pagination.
- **Panier local** : le panier est stocké dans le navigateur (`localStorage`). Il est vidé à la déconnexion et
  n'est pas synchronisé entre plusieurs appareils.
