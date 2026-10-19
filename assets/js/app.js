/* DO Transfert — logique commune (accueil + réservation) */
(function () {
  "use strict";

  var C = window.DOT_CONFIG;
  var DOT = (window.DOT = {});

  /* ---------- Utilitaires ---------- */
  var $ = (DOT.$ = function (sel, ctx) { return (ctx || document).querySelector(sel); });
  var $$ = (DOT.$$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); });

  DOT.icon = function (name, cls) {
    return '<svg class="' + (cls || "") + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  };

  DOT.esc = function (str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  var money = new Intl.NumberFormat(C.locale, { style: "currency", currency: C.currency, maximumFractionDigits: 0 });
  DOT.money = function (n) { return money.format(n); };

  DOT.formatDate = function (iso) {
    if (!iso) return "";
    var d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString(C.locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  DOT.todayISO = function () {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };

  /* ---------- Lieux & distances ---------- */
  function normalize(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }

  DOT.findPlace = function (name) {
    var n = normalize(name);
    if (!n) return null;
    for (var i = 0; i < C.places.length; i++) if (normalize(C.places[i].name) === n) return C.places[i];
    return null;
  };

  DOT.searchPlaces = function (q) {
    var n = normalize(q);
    if (!n) return C.places.slice(0, 8);
    var words = n.split(" ");
    return C.places.filter(function (p) {
      var hay = normalize(p.name);
      return words.every(function (w) { return hay.indexOf(w) !== -1; });
    }).slice(0, 8);
  };

  function haversine(a, b) {
    var R = 6371, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  DOT.distanceKm = function (from, to) {
    var a = DOT.findPlace(from), b = DOT.findPlace(to);
    if (!a || !b) return null;
    return Math.max(3, Math.round(haversine(a, b) * C.roadFactor));
  };

  /* ---------- Tarification ---------- */
  function roundTo5(n) { return Math.ceil(n / 5) * 5; }

  function isNight(time) {
    if (!time) return false;
    var h = parseInt(time.split(":")[0], 10);
    return h >= 22 || h < 6;
  }

  // Renvoie { total, oneWay, km, night, ret } ou null si un devis est nécessaire.
  DOT.estimate = function (vehicle, trip) {
    var legBase, km = null;
    if (trip.mode === "hourly") {
      legBase = Math.max(vehicle.minimum, vehicle.perHour * (parseInt(trip.hours, 10) || 2));
    } else {
      km = DOT.distanceKm(trip.from, trip.to);
      if (km == null) return null;
      legBase = Math.max(vehicle.minimum, vehicle.base + vehicle.perKm * km);
    }
    var leg = function (time) { return roundTo5(legBase * (isNight(time) ? 1 + C.nightSurcharge : 1)); };

    var oneWay = leg(trip.time);
    var ret = trip.mode !== "hourly" && !!trip.returnTrip;
    var total = ret ? roundTo5((oneWay + leg(trip.returnTime)) * (1 - C.returnDiscount)) : oneWay;
    return { total: total, oneWay: oneWay, km: km, night: isNight(trip.time) || (ret && isNight(trip.returnTime)), ret: ret };
  };

  DOT.fromPrice = function (vehicle) {
    return vehicle.minimum;
  };

  /* ---------- Illustrations de véhicules (line-art) ---------- */
  var shapes = {
    sedan: {
      body: "M8 66 L8 58 C8 52 13 49 22 48 L62 44 C76 31 94 24 118 23 L152 23 C170 23 186 31 200 43 L232 48 C243 50 250 55 250 62 L250 66 L222 66 A18 18 0 0 0 186 66 L78 66 A18 18 0 0 0 42 66 Z",
      windows: "M72 44 C84 33 98 28 118 28 L134 28 L134 44 Z M140 28 L152 28 C166 28 178 34 190 44 L140 44 Z",
      lines: "M137 46 L137 64 M26 54 L238 54 M238 52 L247 56",
      wheels: [60, 204], r: 14,
    },
    suv: {
      body: "M8 66 L8 52 C8 46 13 43 22 42 L60 40 C70 26 84 18 108 17 L170 17 C186 17 196 24 206 38 L234 42 C244 44 250 49 250 56 L250 66 L222 66 A20 20 0 0 0 182 66 L82 66 A20 20 0 0 0 42 66 Z",
      windows: "M70 40 C78 28 90 22 108 22 L136 22 L136 40 Z M142 22 L168 22 C180 22 188 28 196 40 L142 40 Z",
      lines: "M139 42 L139 64 M24 50 L240 50 M238 47 L247 51",
      wheels: [62, 202], r: 15,
    },
    van: {
      body: "M8 66 L8 36 C8 26 14 20 26 19 L176 18 C192 18 204 26 216 38 L238 44 C246 46 250 51 250 58 L250 66 L224 66 A18 18 0 0 0 188 66 L76 66 A18 18 0 0 0 40 66 Z",
      windows: "M22 24 H68 V40 H22 Z M74 24 H120 V40 H74 Z M126 24 H172 V40 H126 Z M178 24 C190 24 198 30 206 40 L178 40 Z",
      lines: "M124 44 L124 64 M14 50 L242 50 M238 48 L247 52",
      wheels: [58, 206], r: 14,
    },
  };

  DOT.vehicleSVG = function (shape) {
    var s = shapes[shape] || shapes.sedan;
    var wheels = s.wheels.map(function (x) {
      return '<circle cx="' + x + '" cy="66" r="' + s.r + '"/><circle cx="' + x + '" cy="66" r="' + (s.r * 0.42).toFixed(1) + '"/>';
    }).join("");
    return (
      '<svg viewBox="0 0 258 92" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' +
      '<ellipse cx="129" cy="84" rx="118" ry="4" fill="currentColor" stroke="none" opacity="0.12"/>' +
      '<path d="' + s.body + '"/>' +
      '<path d="' + s.windows + '" fill="currentColor" fill-opacity="0.12"/>' +
      '<path d="' + s.lines + '" opacity="0.6"/>' +
      wheels +
      "</svg>"
    );
  };

  /* ---------- Coordonnées de la marque ---------- */
  function fillBrand() {
    var b = C.brand;
    $$("[data-brand]").forEach(function (el) {
      var key = el.getAttribute("data-brand");
      if (b[key] != null) el.textContent = b[key];
    });
    $$("[data-href='phone']").forEach(function (a) { a.href = "tel:" + b.phoneHref; });
    $$("[data-href='email']").forEach(function (a) { a.href = "mailto:" + b.email; });
    $$("[data-href='whatsapp']").forEach(function (a) {
      a.href = "https://wa.me/" + b.whatsapp + "?text=" + encodeURIComponent("Bonjour " + b.name + ", je souhaite réserver un chauffeur.");
      a.target = "_blank"; a.rel = "noopener";
    });
    $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- En-tête & menu mobile ---------- */
  function initHeader() {
    var header = $(".site-header");
    if (!header) return;
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 24); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    var toggle = $(".menu-toggle");
    if (!toggle) return;
    var setOpen = function (open) {
      document.body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      document.body.style.overflow = open ? "hidden" : "";
    };
    toggle.addEventListener("click", function () { setOpen(!document.body.classList.contains("menu-open")); });
    $$(".mobile-menu a").forEach(function (a) { a.addEventListener("click", function () { setOpen(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
  }

  /* ---------- Révélation au scroll ---------- */
  function initReveal() {
    var els = $$(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Autocomplétion accessible ---------- */
  var typeIcon = { airport: "plane", station: "train", business: "briefcase", leisure: "sparkle", city: "pin" };
  var typeLabel = { airport: "Aéroport", station: "Gare", business: "Affaires", leisure: "Loisirs", city: "Ville" };

  function highlight(text, q) {
    var safe = DOT.esc(text);
    var words = normalize(q).split(" ").filter(Boolean);
    if (!words.length) return safe;
    // Surlignage simple insensible à la casse sur le texte d'origine
    words.forEach(function (w) {
      var re = new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "i");
      safe = safe.replace(re, "<mark>$1</mark>");
    });
    return safe;
  }

  DOT.autocomplete = function (input) {
    var list = document.getElementById(input.getAttribute("aria-controls"));
    var active = -1, items = [];

    function close() {
      list.classList.remove("open");
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      active = -1;
    }
    function render() {
      items = DOT.searchPlaces(input.value);
      if (!items.length) { close(); return; }
      list.innerHTML = items.map(function (p, i) {
        return '<li class="ac-item" role="option" id="' + list.id + "-" + i + '" aria-selected="false" data-i="' + i + '">' +
          DOT.icon(typeIcon[p.type] || "pin") +
          "<div>" + highlight(p.name, input.value) + "<small>" + (typeLabel[p.type] || "") + "</small></div></li>";
      }).join("");
      list.classList.add("open");
      input.setAttribute("aria-expanded", "true");
      active = -1;
    }
    function setActive(i) {
      var opts = $$(".ac-item", list);
      if (!opts.length) return;
      active = (i + opts.length) % opts.length;
      opts.forEach(function (o, j) { o.setAttribute("aria-selected", String(j === active)); });
      input.setAttribute("aria-activedescendant", opts[active].id);
      opts[active].scrollIntoView({ block: "nearest" });
    }
    function choose(i) {
      if (!items[i]) return;
      input.value = items[i].name;
      close();
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    input.addEventListener("input", render);
    input.addEventListener("focus", render);
    input.addEventListener("blur", function () { setTimeout(close, 150); });
    input.addEventListener("keydown", function (e) {
      if (!list.classList.contains("open")) { if (e.key === "ArrowDown") render(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Enter" && active > -1) { e.preventDefault(); choose(active); }
      else if (e.key === "Escape") close();
    });
    list.addEventListener("mousedown", function (e) {
      var li = e.target.closest(".ac-item");
      if (li) { e.preventDefault(); choose(+li.getAttribute("data-i")); }
    });
  };

  /* ---------- Formulaire de trajet (accueil + page réservation) ---------- */
  function options(from, to, selected, suffix) {
    var out = "";
    for (var i = from; i <= to; i++) {
      out += '<option value="' + i + '"' + (String(i) === String(selected) ? " selected" : "") + ">" + i + " " + suffix(i) + "</option>";
    }
    return out;
  }

  DOT.buildTripForm = function (container, opts) {
    var p = opts.prefix || "trip";
    var t = Object.assign({ mode: "transfer", from: "", to: "", date: "", time: "", hours: 3, pax: 2, bags: 2 }, opts.trip || {});
    var maxPax = Math.max.apply(null, C.vehicles.map(function (v) { return v.passengers; }));

    container.innerHTML =
      '<form class="trip-form" novalidate>' +
      '<div class="tabs" role="tablist" aria-label="Type de réservation">' +
      '<button type="button" class="tab" role="tab" data-mode="transfer" aria-selected="' + (t.mode !== "hourly") + '">' + DOT.icon("route") + "Transfert</button>" +
      '<button type="button" class="tab" role="tab" data-mode="hourly" aria-selected="' + (t.mode === "hourly") + '">' + DOT.icon("hourglass") + "À l'heure</button>" +
      "</div>" +
      '<div class="route-fields">' +
      '<div class="field" data-field="from"><label class="field-label" for="' + p + '-from" data-label-from>Départ</label>' +
      '<div class="input-wrap">' + DOT.icon("pin", "icon") +
      '<input class="input" id="' + p + '-from" name="from" type="text" placeholder="Aéroport, gare, adresse…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="' + p + '-from-list" value="' + DOT.esc(t.from) + '">' +
      '<ul class="ac-list" id="' + p + '-from-list" role="listbox"></ul></div>' +
      '<p class="field-error" role="alert">Indiquez un lieu de prise en charge.</p></div>' +
      '<button type="button" class="swap-btn" aria-label="Inverser départ et arrivée" data-transfer-only>' + DOT.icon("swap") + "</button>" +
      '<div class="field" data-field="to" data-transfer-only><label class="field-label" for="' + p + '-to">Arrivée</label>' +
      '<div class="input-wrap">' + DOT.icon("flag", "icon") +
      '<input class="input" id="' + p + '-to" name="to" type="text" placeholder="Destination" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="' + p + '-to-list" value="' + DOT.esc(t.to) + '">' +
      '<ul class="ac-list" id="' + p + '-to-list" role="listbox"></ul></div>' +
      '<p class="field-error" role="alert">Indiquez une destination différente du départ.</p></div>' +
      "</div>" +
      '<div class="field" data-field="hours" data-hourly-only><label class="field-label" for="' + p + '-hours">Durée de mise à disposition</label>' +
      '<div class="input-wrap">' + DOT.icon("hourglass", "icon") +
      '<select class="input" id="' + p + '-hours" name="hours">' + options(2, 12, t.hours, function () { return "heures"; }) + "</select></div></div>" +
      '<div class="field-row keep">' +
      '<div class="field" data-field="date"><label class="field-label" for="' + p + '-date">Date</label>' +
      '<div class="input-wrap">' + DOT.icon("calendar", "icon") +
      '<input class="input" id="' + p + '-date" name="date" type="date" min="' + DOT.todayISO() + '" value="' + DOT.esc(t.date) + '"></div>' +
      '<p class="field-error" role="alert">Choisissez une date.</p></div>' +
      '<div class="field" data-field="time"><label class="field-label" for="' + p + '-time">Heure</label>' +
      '<div class="input-wrap">' + DOT.icon("clock", "icon") +
      '<input class="input" id="' + p + '-time" name="time" type="time" step="300" value="' + DOT.esc(t.time) + '"></div>' +
      '<p class="field-error" role="alert">Choisissez une heure.</p></div>' +
      "</div>" +
      '<div class="field-row keep">' +
      '<div class="field"><label class="field-label" for="' + p + '-pax">Passagers</label>' +
      '<div class="input-wrap">' + DOT.icon("users", "icon") +
      '<select class="input" id="' + p + '-pax" name="pax">' + options(1, maxPax, t.pax, function () { return "pers."; }) + "</select></div></div>" +
      '<div class="field"><label class="field-label" for="' + p + '-bags">Bagages</label>' +
      '<div class="input-wrap">' + DOT.icon("luggage", "icon") +
      '<select class="input" id="' + p + '-bags" name="bags">' + options(0, maxPax, t.bags, function (n) { return n > 1 ? "bagages" : "bagage"; }) + "</select></div></div>" +
      "</div>" +
      '<button type="submit" class="btn btn-gold btn-block">' + (opts.submitLabel || "Voir les tarifs") + DOT.icon("arrow", "arrow") + "</button>" +
      "</form>";

    var form = $("form", container);
    var mode = t.mode === "hourly" ? "hourly" : "transfer";

    function applyMode() {
      $$("[data-transfer-only]", form).forEach(function (el) { el.hidden = mode === "hourly"; });
      $$("[data-hourly-only]", form).forEach(function (el) { el.hidden = mode !== "hourly"; });
      $("[data-label-from]", form).textContent = mode === "hourly" ? "Lieu de prise en charge" : "Départ";
      $$(".tab", form).forEach(function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-mode") === mode)); });
    }
    applyMode();

    $$(".tab", form).forEach(function (b) {
      b.addEventListener("click", function () { mode = b.getAttribute("data-mode"); applyMode(); });
    });
    $(".swap-btn", form).addEventListener("click", function () {
      var a = form.elements.from, b = form.elements.to, tmp = a.value;
      a.value = b.value; b.value = tmp;
    });
    DOT.autocomplete(form.elements.from);
    DOT.autocomplete(form.elements.to);

    $$("input, select", form).forEach(function (el) {
      el.addEventListener("input", function () {
        var f = el.closest(".field");
        if (f) { f.classList.remove("has-error"); el.removeAttribute("aria-invalid"); }
      });
    });

    function fail(name, msg) {
      var f = $('[data-field="' + name + '"]', form);
      if (msg) $(".field-error", f).textContent = msg;
      f.classList.add("has-error");
      var input = $("input, select", f);
      input.setAttribute("aria-invalid", "true");
      return input;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var el = form.elements;
      var data = {
        mode: mode,
        from: el.from.value.trim(),
        to: mode === "hourly" ? "" : el.to.value.trim(),
        hours: mode === "hourly" ? el.hours.value : "",
        date: el.date.value,
        time: el.time.value,
        pax: el.pax.value,
        bags: el.bags.value,
      };
      var firstBad = null;
      $$(".field", form).forEach(function (f) { f.classList.remove("has-error"); });
      if (!data.from) firstBad = firstBad || fail("from");
      if (mode === "transfer" && (!data.to || normalize(data.to) === normalize(data.from))) firstBad = firstBad || fail("to");
      if (!data.date) firstBad = firstBad || fail("date", "Choisissez une date.");
      if (!data.time) firstBad = firstBad || fail("time", "Choisissez une heure.");
      if (data.date && data.time) {
        var when = new Date(data.date + "T" + data.time);
        if (when.getTime() < Date.now() + 2 * 3600 * 1000) {
          firstBad = firstBad || fail("time", "Prévoyez au moins 2 h d'avance (sinon, appelez-nous).");
        }
      }
      if (firstBad) { firstBad.focus(); return; }
      opts.onSubmit(data);
    });

    return form;
  };

  DOT.tripToQuery = function (t) {
    var q = new URLSearchParams();
    ["mode", "from", "to", "hours", "date", "time", "pax", "bags"].forEach(function (k) { if (t[k]) q.set(k, t[k]); });
    return q.toString();
  };

  DOT.tripFromQuery = function (search) {
    var q = new URLSearchParams(search);
    var t = {};
    ["mode", "from", "to", "hours", "date", "time", "pax", "bags"].forEach(function (k) { if (q.get(k)) t[k] = q.get(k); });
    return t;
  };

  /* ---------- Page d'accueil ---------- */
  function initHome() {
    var host = $("#hero-booking");
    if (!host) return;

    DOT.buildTripForm(host, {
      prefix: "hero",
      onSubmit: function (t) { window.location.href = "reservation.html?" + DOT.tripToQuery(t); },
    });

    // Flotte
    var fleet = $("#fleet-grid");
    if (fleet) {
      fleet.innerHTML = C.vehicles.map(function (v, i) {
        return '<article class="vehicle reveal' + (v.featured ? " featured" : "") + '" data-delay="' + (i % 4) + '">' +
          (v.featured ? '<span class="vehicle-tag">Signature</span>' : "") +
          '<div class="vehicle-art">' + DOT.vehicleSVG(v.shape) + "</div>" +
          "<h3>" + DOT.esc(v.name) + "</h3>" +
          '<p class="models">' + DOT.esc(v.models) + "</p>" +
          '<div class="vehicle-specs"><span>' + DOT.icon("users") + v.passengers + " pers.</span><span>" + DOT.icon("luggage") + v.luggage + " bagages</span></div>" +
          '<ul class="vehicle-perks">' + v.perks.map(function (p) { return "<li>" + DOT.icon("check") + DOT.esc(p) + "</li>"; }).join("") + "</ul>" +
          '<div class="vehicle-foot"><p class="price-from">À partir de<strong>' + DOT.money(DOT.fromPrice(v)) + "</strong></p>" +
          '<a href="#reserver" class="btn btn-outline-light">Réserver</a></div>' +
          "</article>";
      }).join("");
    }

    // Trajets populaires
    var routes = $("#routes");
    if (routes) {
      var base = C.vehicles[0];
      routes.innerHTML = $$("template#popular-routes")[0].content.textContent.trim().split("\n").map(function (line, i) {
        var parts = line.split("|").map(function (s) { return s.trim(); });
        var price = DOT.estimate(base, { mode: "transfer", from: parts[0], to: parts[1], time: "12:00" });
        var km = DOT.distanceKm(parts[0], parts[1]);
        return '<a href="#reserver" class="route reveal" data-delay="' + (i % 3) + '" data-prefill="' + DOT.esc(parts[0] + "|" + parts[1]) + '">' +
          '<div class="route-path"><strong>' + DOT.esc(parts[2] || parts[0]) + "</strong>" +
          "<span>" + DOT.icon("arrow") + DOT.esc(parts[3] || parts[1]) + (km ? " · ~" + km + " km" : "") + "</span></div>" +
          '<div class="route-price">dès<strong>' + (price ? DOT.money(price.total) : "Sur devis") + "</strong></div></a>";
      }).join("");
    }

    // Raccourcis : liens qui pré-remplissent le formulaire (trajets, services)
    document.addEventListener("click", function (e) {
      var a = e.target.closest("[data-prefill]");
      if (!a) return;
      e.preventDefault();
      var parts = a.getAttribute("data-prefill").split("|");
      var form = $("form", host);
      if (parts[0] === "hourly") {
        $('.tab[data-mode="hourly"]', form).click();
      } else {
        $('.tab[data-mode="transfer"]', form).click();
        form.elements.from.value = parts[0] || "";
        form.elements.to.value = parts[1] || "";
      }
      $("#reserver").scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(function () { (form.elements.from.value ? form.elements.date : form.elements.from).focus({ preventScroll: true }); }, 600);
    });

    // Avis : navigation
    var track = $(".reviews");
    $$("[data-reviews]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var card = $(".review", track);
        var step = card ? card.getBoundingClientRect().width + 24 : 320;
        track.scrollBy({ left: btn.getAttribute("data-reviews") === "next" ? step : -step, behavior: "smooth" });
      });
    });

    // FAQ
    $$(".faq-q").forEach(function (q) {
      q.addEventListener("click", function () {
        var open = q.getAttribute("aria-expanded") === "true";
        q.setAttribute("aria-expanded", String(!open));
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    fillBrand();
    initHeader();
    initHome();
    if (DOT.onReady) DOT.onReady();
    initReveal();
  });
})();
