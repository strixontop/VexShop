/* VEX Shop — data + cart + helpers (vanilla JS)
   Écrit en ES2015 simple : pas de "?.", pas de "catch {" sans variable,
   pour rester compatible avec les anciens navigateurs. */

var CATEGORIES = [
  { id: "nitro", label: "Nitro" },
  { id: "comptes", label: "Comptes" },
  { id: "deco", label: "Déco" },
  { id: "bot", label: "Bot personnalisé" },
  { id: "boost", label: "Boost" },
];

var BADGE_LABEL = {
  nouveau: "Nouveau",
  limite: "Édition limitée",
  "best-seller": "Best-seller",
};

var FREE_SHIPPING_FROM = 8000;

var PRODUCTS = [
  {
    slug: "chapeau-paille",
    name: "Nitro boost",
    tagline: "L'un des seuls nitro legit.",
    price: 310,
    image: "products/nitro.jpg",
    category: "nitro",
    featured: true,
    badge: "best-seller",
    stock: 0,
  },
  {
    slug: "fruit-maudit",
    name: "Deco",
    tagline: "Tu va aimer et tes potes aussi.",
    price: 499,
    image: "products/deco.jpg",
    category: "deco",
    featured: true,
    badge: null,
    stock: 7,
  },
  {
    slug: "maquette-merry",
    name: "Bot personnalisé",
    tagline: "On crée ton propre bot quelque soit le theme de ton serveur.",
    price: 1499,
    image: "products/bot.png",
    category: "bot",
    featured: true,
    badge: null,
    stock: 5,
  },
  {
    slug: "trio-katanas",
    name: "Boost",
    tagline: "Boost le serveur que tu veux grace a ça.",
    price: 350,
    image: "products/boost.jpg",
    category: "boost",
    featured: true,
    badge: null,
    stock: 4,
  },
  {
    slug: "boussole",
    name: "Compte discord aged",
    tagline: "Tu veux des vieux comptes discord ? Tu a frappé a la bonne porte.",
    price: 899,
    image: "products/dscacc.jpg",
    category: "comptes",
    featured: true,
    badge: null,
    stock: 22,
  },
];

/* Le formatteur Intl est coûteux à créer : on le crée une seule fois. */
var EUR_FORMAT = null;
try {
  EUR_FORMAT = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
} catch (e) {
  EUR_FORMAT = null;
}

function formatPrice(cents) {
  var euros = cents / 100;
  if (EUR_FORMAT) return EUR_FORMAT.format(euros);
  return euros.toFixed(2).replace(".", ",") + " €";
}

function getProduct(slug) {
  for (var i = 0; i < PRODUCTS.length; i++) {
    if (PRODUCTS[i].slug === slug) return PRODUCTS[i];
  }
  return undefined;
}

function searchProducts(query, category) {
  var q = (query || "").trim().toLowerCase();
  return PRODUCTS.filter(function (p) {
    var catOk = !category || category === "all" || p.category === category;
    if (!catOk) return false;
    if (!q) return true;
    return p.name.toLowerCase().indexOf(q) !== -1 || p.tagline.toLowerCase().indexOf(q) !== -1;
  });
}

/* ——— Cart (localStorage, protégé : le stockage peut être bloqué) ——— */
var CART_KEY = "vexshop-cart";
var memoryCart = [];

function loadCart() {
  try {
    var data = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return memoryCart;
  }
}

function saveCart(lines) {
  memoryCart = lines;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(lines));
  } catch (e) {
    /* stockage indisponible (navigation privée, quota…) : on garde le panier en mémoire */
  }
  updateCartBadge();
}

function cartCount(lines) {
  return lines.reduce(function (n, l) { return n + l.qty; }, 0);
}

function cartSubtotal(lines) {
  return lines.reduce(function (sum, l) {
    var p = getProduct(l.slug);
    return sum + (p ? p.price * l.qty : 0);
  }, 0);
}

function addToCart(slug, qty) {
  qty = qty || 1;
  var product = getProduct(slug);
  if (!product || product.stock === 0) return;
  var lines = loadCart();
  var existing = null;
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].slug === slug) existing = lines[i];
  }
  if (existing) {
    existing.qty = Math.min(product.stock, existing.qty + qty);
  } else {
    lines.push({ slug: slug, qty: Math.min(product.stock, qty) });
  }
  saveCart(lines);
  toast("Ajouté au panier");
}

function setQty(slug, qty) {
  var product = getProduct(slug);
  if (!product) return;
  var lines = loadCart();
  if (qty <= 0) {
    lines = lines.filter(function (l) { return l.slug !== slug; });
  } else {
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].slug === slug) lines[i].qty = Math.min(product.stock, qty);
    }
  }
  saveCart(lines);
}

function removeFromCart(slug) {
  saveCart(loadCart().filter(function (l) { return l.slug !== slug; }));
}

function clearCart() {
  saveCart([]);
}

function updateCartBadge() {
  var n = cartCount(loadCart());
  var els = document.querySelectorAll("[data-cart-count]");
  for (var i = 0; i < els.length; i++) {
    els[i].textContent = String(n);
    els[i].style.display = n > 0 ? "grid" : "none";
  }
}

/* ——— Toast ——— */
function toast(msg) {
  var el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.setAttribute("role", "status");
    el.style.cssText =
      "position:fixed;bottom:1.5rem;left:50%;-webkit-transform:translateX(-50%);transform:translateX(-50%);background:#1d1236;color:#eef3fb;padding:0.75rem 1.25rem;border-radius:10px;box-shadow:0 0 0 1px rgba(168,85,247,0.35);z-index:100;font-size:0.9rem;opacity:0";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  clearTimeout(el._t);
  el._t = setTimeout(function () {
    el.style.opacity = "0";
  }, 2200);
}

/* ——— Product card HTML ——— */
function productCardHTML(p) {
  var badge = p.badge ? '<span class="badge">' + BADGE_LABEL[p.badge] + "</span>" : "";
  var low = "";
  if (p.stock === 0) low = '<span class="badge badge-danger">Épuisé</span>';
  else if (p.stock <= 6) low = '<span class="badge badge-danger">Plus que ' + p.stock + "</span>";

  return (
    '<article class="product-card">' +
      '<a href="boutique.html" class="thumb">' +
        '<img src="' + p.image + '" alt="' + p.name + '" width="400" height="400" loading="lazy" decoding="async" />' +
        badge + low +
      "</a>" +
      '<div class="body">' +
        "<div>" +
          '<a href="boutique.html" class="name">' + p.name + "</a>" +
          '<p class="tagline">' + p.tagline + "</p>" +
        "</div>" +
        '<div class="row">' +
          '<p class="price">' + formatPrice(p.price) + "</p>" +
          '<button class="btn btn-sm btn-primary" data-add="' + p.slug + '"' + (p.stock === 0 ? " disabled" : "") + ">Ajouter</button>" +
        "</div>" +
      "</div>" +
    "</article>"
  );
}

/* ——— Shared header/footer inject ——— */
function renderHeader(active) {
  function nav(href, label, key) {
    return '<a href="' + href + '" class="' + (active === key ? "active" : "") + '">' + label + "</a>";
  }
  return (
  '<header>' +
    '<div class="container-page header-inner">' +
      '<button class="icon-btn mobile-menu-btn" aria-label="Menu" aria-expanded="false" id="menu-btn">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>' +
      '</button>' +
      '<a href="index.html" class="logo">' +
        '<img src="logo-96.webp" alt="" width="44" height="44" />' +
        '<span>VEX<span class="accent">SHOP</span></span>' +
      '</a>' +
      '<nav id="main-nav">' +
        nav("boutique.html", "Boutique", "boutique") +
        nav("a-propos.html", "À propos", "a-propos") +
        nav("contact.html", "Contact", "contact") +
      '</nav>' +
      '<div class="header-actions">' +
        '<form class="search-form" action="boutique.html" method="get" id="header-search">' +
          '<input type="search" name="q" placeholder="Rechercher…" aria-label="Recherche" />' +
          '<button type="submit" class="icon-btn" aria-label="Chercher">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
          '</button>' +
        '</form>' +
        '<a href="panier.html" class="icon-btn" style="position:relative" aria-label="Panier">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>' +
          '<span class="cart-badge" data-cart-count style="display:none">0</span>' +
        '</a>' +
      '</div>' +
    '</div>' +
    '<div class="mobile-nav" id="mobile-nav" hidden>' +
      '<a href="boutique.html">Boutique</a>' +
      '<a href="a-propos.html">À propos</a>' +
      '<a href="contact.html">Contact</a>' +
      '<a href="panier.html">Panier</a>' +
    '</div>' +
  '</header>'
  );
}

function renderFooter() {
  return (
  '<footer>' +
    '<div class="container-page footer-inner">' +
      '<div>' +
        '<div class="footer-brand">' +
          '<img src="logo-96.webp" alt="" width="48" height="48" loading="lazy" decoding="async" />' +
          '<p>VEX<span style="color:var(--color-primary)">SHOP</span></p>' +
        '</div>' +
        '<p class="footer-desc">Vous savez sur qui compter.</p>' +
      '</div>' +
      '<div class="footer-col">' +
        '<p>Infos</p>' +
        '<ul>' +
          '<li><a href="a-propos.html">À propos</a></li>' +
          '<li><a href="contact.html">Contact</a></li>' +
        '</ul>' +
      '</div>' +
    '</div>' +
    '<div class="footer-bottom">© 2026 VEX Shop — Tous droits réservés</div>' +
  '</footer>'
  );
}

function initLayout(active) {
  var headerSlot = document.getElementById("site-header");
  var footerSlot = document.getElementById("site-footer");
  if (headerSlot) headerSlot.outerHTML = renderHeader(active);
  if (footerSlot) footerSlot.outerHTML = renderFooter();

  updateCartBadge();

  var menuBtn = document.getElementById("menu-btn");
  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      var nav = document.getElementById("mobile-nav");
      if (!nav) return;
      nav.hidden = !nav.hidden;
      menuBtn.setAttribute("aria-expanded", nav.hidden ? "false" : "true");
    });
  }

  document.body.addEventListener("click", function (e) {
    var target = e.target;
    while (target && target !== document.body) {
      if (target.getAttribute && target.hasAttribute("data-add")) {
        e.preventDefault();
        addToCart(target.getAttribute("data-add"));
        return;
      }
      target = target.parentNode;
    }
  });
}
