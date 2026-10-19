/* DO Transfert — tunnel de réservation */
(function () {
  "use strict";

  var C = window.DOT_CONFIG;
  var $ = DOT.$, $$ = DOT.$$;
  var STORE = "dot-booking";

  var state = {
    trip: DOT.tripFromQuery(window.location.search),
    vehicleId: null,
    details: {},
    extras: [],
    step: 1,
    route: null,    // { km, minutes, coords, exact } une fois l'itinéraire calculé
    routing: false, // true pendant le calcul
  };

  // Récupère la saisie en cours si la page est rechargée sur le même trajet
  try {
    var saved = JSON.parse(sessionStorage.getItem(STORE) || "null");
    if (saved && DOT.tripToQuery(saved.trip) === DOT.tripToQuery(state.trip)) {
      state.vehicleId = saved.vehicleId;
      state.details = saved.details || {};
      state.extras = saved.extras || [];
    }
  } catch (e) { /* stockage indisponible : on continue sans */ }

  function persist() {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(state, function (k, v) { return k === "route" || k === "routing" ? undefined : v; }));
    } catch (e) { /* ignoré */ }
  }

  function tripIsComplete(t) {
    return t.from && t.date && t.time && (t.mode === "hourly" ? t.hours : t.to);
  }

  function vehicle() {
    return C.vehicles.filter(function (v) { return v.id === state.vehicleId; })[0];
  }

  // Trajet enrichi des options de retour (saisies à l'étape 2)
  function fullTrip() {
    var d = state.details;
    return Object.assign({}, state.trip, {
      routeKm: state.route ? state.route.km : undefined,
      returnTrip: state.trip.mode !== "hourly" && d.returnTrip,
      returnDate: d.returnDate,
      returnTime: d.returnTime,
    });
  }

  function legs() { return fullTrip().returnTrip ? 2 : 1; }

  function extrasTotal() {
    return C.extras.reduce(function (sum, x) {
      return state.extras.indexOf(x.id) !== -1 ? sum + x.price * legs() : sum;
    }, 0);
  }

  function quote(v) {
    var e = DOT.estimate(v, fullTrip());
    return e ? Object.assign(e, { grand: e.total + extrasTotal() }) : null;
  }

  function fits(v) {
    return (+state.trip.pax || 1) <= v.passengers && (+state.trip.bags || 0) <= v.luggage;
  }

  /* ---------- Navigation entre étapes ---------- */
  var titles = { trip: "Votre trajet", 1: "Choisissez votre véhicule", 2: "Vos coordonnées", 3: "Confirmation", done: "Merci !" };

  function showStep(step) {
    state.step = step;
    $$(".step-panel").forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== String(step); });
    var n = step === "trip" ? 0 : step === "done" ? 4 : +step;
    $$(".stepper li").forEach(function (li) {
      var s = +li.getAttribute("data-step");
      li.classList.toggle("active", s === n);
      li.classList.toggle("done", s < n);
      if (s === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    $("#booking-title").textContent = titles[step];
    $("#edit-trip").hidden = step === "done";
    if (step === 1 && map) setTimeout(function () { map.invalidateSize(); fitMap(); }, 60);
    var panel = $("#panel");
    var top = panel.getBoundingClientRect().top + window.scrollY - 100;
    if (window.scrollY > top) window.scrollTo({ top: top, behavior: "smooth" });
    panel.focus({ preventScroll: true });
    persist();
  }

  /* ---------- Récapitulatif latéral ---------- */
  function renderSummary() {
    var t = fullTrip();
    var esc = DOT.esc;
    $("#sum-route").innerHTML =
      "<div><small>Départ</small><strong>" + esc(t.from || "—") + "</strong></div>" +
      (t.mode === "hourly"
        ? "<div><small>Mise à disposition</small><strong>" + esc(t.hours) + " heures</strong></div>"
        : "<div><small>Arrivée</small><strong>" + esc(t.to || "—") + "</strong></div>");

    var v = vehicle();
    var q = v ? quote(v) : null;
    var rows = [
      ["Date", t.date ? DOT.formatDate(t.date) : "—"],
      ["Heure", t.time || "—"],
      ["Passagers", (t.pax || 1) + " · " + (t.bags || 0) + " bagage(s)"],
    ];
    if (state.route && t.mode !== "hourly") {
      rows.push(["Distance", (state.route.exact ? "" : "~") + state.route.km + " km"]);
      rows.push(["Durée estimée", DOT.formatDuration(state.route.minutes)]);
    } else if (q && q.km) rows.push(["Distance estimée", "~" + q.km + " km"]);
    if (v) rows.push(["Véhicule", v.name]);
    if (t.returnTrip) rows.push(["Retour", (t.returnDate ? DOT.formatDate(t.returnDate) : "—") + (t.returnTime ? " · " + t.returnTime : "")]);
    C.extras.forEach(function (x) {
      if (state.extras.indexOf(x.id) !== -1) rows.push([x.label, x.price ? DOT.money(x.price * legs()) : "Offert"]);
    });
    $("#sum-list").innerHTML = rows.map(function (r) { return "<li><span>" + esc(r[0]) + "</span><b>" + esc(r[1]) + "</b></li>"; }).join("");

    $("#sum-total").textContent = !v ? "—" : q ? DOT.money(q.grand) : "Sur devis";
    var notes = ["Prix fixe : péages, attente et suivi de vol inclus."];
    if (q && q.night) notes.push("Majoration de nuit incluse (22 h – 6 h).");
    if (q && q.ret) notes.push("Remise aller-retour de " + Math.round(C.returnDiscount * 100) + " % appliquée.");
    $("#sum-note").textContent = notes.join(" ");
  }

  /* ---------- Étape 1 : véhicules ---------- */
  function renderVehicles() {
    var host = $("#vehicle-options");
    var anyQuote = false;

    if (state.vehicleId && !fits(vehicle() || {})) state.vehicleId = null;
    if (!state.vehicleId) {
      var eligible = C.vehicles.filter(fits);
      if (eligible.length) state.vehicleId = eligible[0].id;
    }

    host.innerHTML = C.vehicles.map(function (v) {
      var q = quote(v);
      if (q) anyQuote = true;
      var ok = fits(v);
      var id = "veh-" + v.id;
      return '<div class="v-option">' +
        '<input type="radio" name="vehicle" id="' + id + '" value="' + v.id + '"' + (v.id === state.vehicleId ? " checked" : "") + (ok ? "" : " disabled") + ">" +
        '<label for="' + id + '">' +
        (v.featured ? '<span class="badge">Signature</span>' : "") +
        '<div class="v-art">' + DOT.vehicleSVG(v.shape) + "</div>" +
        "<div><h3>" + DOT.esc(v.name) + '</h3><p class="models">' + DOT.esc(v.models) + "</p>" +
        '<div class="meta"><span>' + DOT.icon("users") + v.passengers + " pers.</span><span>" + DOT.icon("luggage") + v.luggage + " bagages</span>" +
        "<span>" + DOT.icon("sparkle") + DOT.esc(v.perks[0]) + "</span></div>" +
        (ok ? "" : '<p class="capacity-note">Capacité insuffisante pour ' + state.trip.pax + " passager(s) et " + (state.trip.bags || 0) + " bagage(s)</p>") +
        "</div>" +
        '<div class="v-price">' + (q ? "<strong>" + DOT.money(q.total) + "</strong><small>" + (q.ret ? "aller-retour" : "prix fixe") + "</small>"
          : state.routing ? '<span class="price-loading" aria-label="Calcul du prix"></span><small>calcul…</small>'
          : "<strong style=\"font-size:22px\">Sur devis</strong><small>réponse rapide</small>") + "</div>" +
        "</label></div>";
    }).join("");

    $("#quote-alert").hidden = anyQuote || state.routing;
    $('[data-panel="1"] [data-next="2"]').disabled = !state.vehicleId;

    $$('input[name="vehicle"]', host).forEach(function (r) {
      r.addEventListener("change", function () {
        state.vehicleId = r.value;
        $('[data-panel="1"] [data-next="2"]').disabled = false;
        renderSummary();
        persist();
      });
    });
  }

  /* ---------- Étape 2 : coordonnées ---------- */
  function initDetails() {
    var form = $("#details-form");
    var d = state.details;

    $("#return-discount").textContent = Math.round(C.returnDiscount * 100) + " %";
    $("#extras").innerHTML = C.extras.map(function (x) {
      return '<label class="check"><input type="checkbox" name="extra" value="' + x.id + '"' + (state.extras.indexOf(x.id) !== -1 ? " checked" : "") + ">" +
        "<span>" + DOT.esc(x.label) + "</span><em>" + (x.price ? "+ " + DOT.money(x.price) : "Offert") + "</em></label>";
    }).join("");

    ["firstName", "lastName", "email", "phone", "flight", "signName", "notes", "returnDate", "returnTime"].forEach(function (k) {
      if (d[k]) form.elements[k].value = d[k];
    });
    form.elements.returnTrip.checked = !!d.returnTrip;
    $("#return-fields").hidden = !d.returnTrip;

    function collect() {
      var el = form.elements;
      ["firstName", "lastName", "email", "phone", "flight", "signName", "notes", "returnDate", "returnTime"].forEach(function (k) {
        state.details[k] = el[k].value.trim();
      });
      state.details.returnTrip = el.returnTrip.checked;
      state.extras = $$('input[name="extra"]:checked', form).map(function (c) { return c.value; });
      renderSummary();
      persist();
    }

    form.addEventListener("input", function (e) {
      var f = e.target.closest(".field");
      if (f) { f.classList.remove("has-error"); e.target.removeAttribute("aria-invalid"); }
      collect();
    });
    form.addEventListener("change", collect);
    form.elements.returnTrip.addEventListener("change", function () {
      $("#return-fields").hidden = !this.checked;
      if (this.checked && !form.elements.returnDate.value) form.elements.returnDate.value = state.trip.date || "";
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      collect();
      var bad = null;
      function fail(name) {
        var f = $('[data-field="' + name + '"]', form);
        f.classList.add("has-error");
        var input = $("input", f);
        input.setAttribute("aria-invalid", "true");
        bad = bad || input;
      }
      $$(".field", form).forEach(function (f) { f.classList.remove("has-error"); });
      var dd = state.details;
      if (!dd.firstName) fail("firstName");
      if (!dd.lastName) fail("lastName");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dd.email)) fail("email");
      if (dd.phone.replace(/\D/g, "").length < 8) fail("phone");
      if (dd.returnTrip) {
        if (!dd.returnDate) fail("returnDate");
        if (!dd.returnTime) fail("returnTime");
        else if (dd.returnDate && new Date(dd.returnDate + "T" + dd.returnTime) <= new Date(state.trip.date + "T" + state.trip.time)) fail("returnTime");
      }
      if (bad) { bad.focus(); return; }
      renderReview();
      showStep(3);
    });
  }

  /* ---------- Étape 3 : récapitulatif ---------- */
  function renderReview() {
    var t = fullTrip(), d = state.details, v = vehicle(), q = quote(v), esc = DOT.esc;
    function block(title, rows) {
      return '<div class="review-block"><h4>' + title + "</h4><dl>" +
        rows.filter(function (r) { return r[1]; }).map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("") +
        "</dl></div>";
    }
    $("#review").innerHTML =
      block("Trajet", [
        ["Type", t.mode === "hourly" ? "Mise à disposition (" + t.hours + " h)" : "Transfert"],
        ["Départ", t.from],
        ["Arrivée", t.mode === "hourly" ? "" : t.to],
        ["Date & heure", DOT.formatDate(t.date) + " à " + t.time],
        ["Retour", t.returnTrip ? DOT.formatDate(t.returnDate) + " à " + t.returnTime : ""],
        ["N° de vol / train", d.flight],
      ]) +
      block("Véhicule & tarif", [
        ["Véhicule", v.name],
        ["Passagers", t.pax + " passager(s), " + (t.bags || 0) + " bagage(s)"],
        ["Options", C.extras.filter(function (x) { return state.extras.indexOf(x.id) !== -1; }).map(function (x) { return x.label; }).join(", ")],
        ["Total TTC", q ? DOT.money(q.grand) : "Sur devis — confirmé par notre équipe"],
      ]) +
      block("Passager", [
        ["Nom", d.firstName + " " + d.lastName],
        ["E-mail", d.email],
        ["Téléphone", d.phone],
        ["Pancarte", d.signName],
        ["Message", d.notes],
      ]);
  }

  function bookingText(ref) {
    var t = fullTrip(), d = state.details, v = vehicle(), q = quote(v);
    var lines = [
      "Nouvelle réservation " + ref,
      "",
      "Type : " + (t.mode === "hourly" ? "Mise à disposition " + t.hours + " h" : "Transfert"),
      "Départ : " + t.from,
    ];
    if (t.mode !== "hourly") lines.push("Arrivée : " + t.to);
    lines.push("Date : " + DOT.formatDate(t.date) + " à " + t.time);
    if (t.returnTrip) lines.push("Retour : " + DOT.formatDate(t.returnDate) + " à " + t.returnTime);
    lines.push(
      "Véhicule : " + v.name,
      "Passagers : " + t.pax + " · Bagages : " + (t.bags || 0)
    );
    var ex = C.extras.filter(function (x) { return state.extras.indexOf(x.id) !== -1; }).map(function (x) { return x.label; });
    if (ex.length) lines.push("Options : " + ex.join(", "));
    if (d.flight) lines.push("Vol / train : " + d.flight);
    lines.push(
      "Prix : " + (q ? DOT.money(q.grand) : "sur devis"),
      "",
      "Client : " + d.firstName + " " + d.lastName,
      "Téléphone : " + d.phone,
      "E-mail : " + d.email
    );
    if (d.signName) lines.push("Pancarte : " + d.signName);
    if (d.notes) lines.push("Message : " + d.notes);
    return lines.join("\n");
  }

  function makeRef() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", out = "";
    var rnd = new Uint8Array(6);
    (window.crypto || window.msCrypto).getRandomValues(rnd);
    for (var i = 0; i < 6; i++) out += chars[rnd[i] % chars.length];
    return "DOT-" + out;
  }

  function initConfirm() {
    var terms = $("#terms"), err = $("#terms-error"), btn = $("#confirm-btn");
    terms.addEventListener("change", function () { if (terms.checked) err.style.display = "none"; });

    btn.addEventListener("click", function () {
      if (!terms.checked) { err.style.display = "block"; terms.focus(); return; }
      var ref = makeRef();
      var text = bookingText(ref);
      var b = C.brand;

      $("#booking-ref").textContent = "Référence " + ref;
      $("#send-whatsapp").href = "https://wa.me/" + b.whatsapp + "?text=" + encodeURIComponent(text);
      $("#send-email").href = "mailto:" + b.email + "?subject=" + encodeURIComponent("Réservation " + ref) + "&body=" + encodeURIComponent(text);

      function done(sent) {
        if (sent) {
          $("#success-text").textContent = "Merci " + state.details.firstName + " ! Votre réservation a bien été transmise. Vous recevrez la confirmation du chauffeur à " + state.details.email + ". Vous pouvez aussi nous l'envoyer sur WhatsApp pour un suivi en direct.";
        }
        try { sessionStorage.removeItem(STORE); } catch (e) { /* ignoré */ }
        showStep("done");
      }

      if (!C.bookingEndpoint) { done(false); return; }

      btn.disabled = true;
      btn.firstChild.textContent = "Envoi en cours… ";
      fetch(C.bookingEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ reference: ref, trip: fullTrip(), vehicle: vehicle().name, extras: state.extras, customer: state.details, price: (quote(vehicle()) || {}).grand || null, message: text }),
      })
        .then(function (r) { done(r.ok); })
        .catch(function () { done(false); });
    });
  }

  /* ---------- Carte & itinéraire ---------- */
  var map = null, layer = null, bounds = null;

  function accent() {
    return getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ff7a00";
  }

  function pin(letter, cls) {
    return L.divIcon({ className: "map-pin " + cls, html: "<span><i>" + letter + "</i></span>", iconSize: [34, 34], iconAnchor: [17, 34] });
  }

  function initMap() {
    if (map || !window.L) return;
    var M = C.map;
    map = L.map("map", { scrollWheelZoom: false, zoomControl: false, attributionControl: true }).setView(M.center, M.zoom);
    L.control.zoom({ position: "topright", zoomInTitle: "Zoom avant", zoomOutTitle: "Zoom arrière" }).addTo(map);
    L.tileLayer(M.tiles, { attribution: M.attribution, maxZoom: 19, subdomains: "abcd" }).addTo(map);
    layer = L.layerGroup().addTo(map);
    // Molette active seulement après un clic sur la carte (évite de bloquer le défilement de la page)
    map.on("click", function () { map.scrollWheelZoom.enable(); });
    map.on("mouseout", function () { map.scrollWheelZoom.disable(); });
  }

  function fitMap() {
    if (!map || !bounds) return;
    map.invalidateSize(false);
    // Marge haute plus grande : le bandeau distance/durée recouvre le haut de la carte
    if (bounds.isValid && bounds.isValid()) map.fitBounds(bounds, { paddingTopLeft: [40, 90], paddingBottomRight: [40, 36], maxZoom: 14 });
  }

  function setMapStatus(html, loading) {
    $("#map-status").innerHTML = html;
    $("#map-status").classList.toggle("loading", !!loading);
  }

  function resolvePoint(name, coord) {
    var known = DOT.coordsFor(name, coord);
    if (known || !name) return Promise.resolve(known);
    return DOT.geocodeSearch(name, 1).then(function (r) { return r[0] || null; }).catch(function () { return null; });
  }

  function drawRoute(a, b, route) {
    if (!map) return;
    layer.clearLayers();
    var pts = [];
    if (route) {
      L.polyline(route.coords, { color: "#0b0b0b", weight: 9, opacity: 0.18, lineCap: "round" }).addTo(layer);
      L.polyline(route.coords, { color: accent(), weight: 5, lineCap: "round", lineJoin: "round", dashArray: route.exact ? null : "8 10", className: "route-line" }).addTo(layer);
      pts = route.coords;
    }
    if (a) { L.marker([a.lat, a.lng], { icon: pin("A", "pin-start"), title: state.trip.from, keyboard: false }).addTo(layer); pts = pts.concat([[a.lat, a.lng]]); }
    if (b) { L.marker([b.lat, b.lng], { icon: pin("B", "pin-end"), title: state.trip.to, keyboard: false }).addTo(layer); pts = pts.concat([[b.lat, b.lng]]); }
    if (pts.length === 1) {
      L.circle(pts[0], { radius: 900, color: accent(), weight: 1, fillOpacity: 0.08 }).addTo(layer);
      bounds = L.latLng(pts[0]).toBounds(4000);
    } else if (pts.length) {
      bounds = L.latLngBounds(pts);
    }
    fitMap();
  }

  function computeRoute() {
    var t = state.trip;
    state.route = null;
    state.routing = true;
    initMap();
    if (layer) layer.clearLayers();
    setMapStatus(DOT.icon("route") + "Calcul de l'itinéraire…", true);

    var hourly = t.mode === "hourly";
    Promise.all([resolvePoint(t.from, t.fromCoord), hourly ? null : resolvePoint(t.to, t.toCoord)])
      .then(function (pts) {
        var a = pts[0], b = pts[1];
        if (hourly || !a || !b) return { a: a, b: b, route: null };
        return DOT.route(a, b).then(function (r) { return { a: a, b: b, route: r }; });
      })
      .then(function (res) {
        state.route = res.route;
        state.routing = false;
        drawRoute(res.a, res.b, res.route);
        if (hourly) {
          setMapStatus(res.a ? DOT.icon("pin") + "Prise en charge · " + DOT.esc(t.hours) + " h de mise à disposition" : DOT.icon("info") + "Adresse de prise en charge à préciser");
        } else if (res.route) {
          setMapStatus(
            '<span class="stat">' + DOT.icon("route") + "<b>" + (res.route.exact ? "" : "~") + res.route.km + " km</b></span>" +
            '<span class="stat">' + DOT.icon("clock") + "<b>" + DOT.formatDuration(res.route.minutes) + "</b></span>" +
            (res.route.exact ? '<span class="stat muted">Itinéraire le plus rapide</span>' : '<span class="stat muted">Tracé estimé</span>')
          );
        } else {
          setMapStatus(DOT.icon("info") + "Adresse introuvable sur la carte : le prix vous sera confirmé par notre équipe.");
        }
        renderVehicles();
        renderSummary();
      });
  }

  /* ---------- Modification du trajet ---------- */
  function openTripEditor() {
    DOT.buildTripForm($("#trip-form"), {
      prefix: "edit",
      trip: state.trip,
      submitLabel: "Voir les véhicules",
      onSubmit: function (t) {
        state.trip = t;
        history.replaceState(null, "", "reservation.html?" + DOT.tripToQuery(t));
        $("#return-block").hidden = t.mode === "hourly";
        showStep(1);
        computeRoute();
        renderVehicles();
        renderSummary();
      },
    });
    showStep("trip");
  }

  /* ---------- Démarrage ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    state.trip.mode = state.trip.mode === "hourly" ? "hourly" : "transfer";
    state.trip.pax = state.trip.pax || "1";
    state.trip.bags = state.trip.bags || "0";

    $("#return-block").hidden = state.trip.mode === "hourly";
    initDetails();
    initConfirm();

    $$("[data-next]").forEach(function (b) {
      b.addEventListener("click", function () {
        var n = b.getAttribute("data-next");
        if (n === "2" && !state.vehicleId) return;
        showStep(+n);
      });
    });
    $("#edit-trip").addEventListener("click", openTripEditor);

    if (!tripIsComplete(state.trip)) {
      renderSummary();
      openTripEditor();
      return;
    }
    computeRoute();
    renderVehicles();
    renderSummary();
    showStep(1);
  });
})();
