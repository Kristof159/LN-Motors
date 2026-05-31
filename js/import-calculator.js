/* ===========================================================
   LN Motors — Import calculator
   Adres-autocomplete via Nominatim (OpenStreetMap) en
   rij-afstand via OSRM. Geen API-key / billing nodig.

   De klant geeft twee adressen in:
     - ophaaladres  (waar de wagen staat)
     - opleveradres (waar de wagen geleverd wordt)
   De km's = rij-afstand tussen die twee adressen.
   =========================================================== */
(function () {
  "use strict";

  // --- Tarief (standaardwaarden; admin kan ze overschrijven) ---
  // Worden bij het laden bijgewerkt vanuit Supabase (tabel "settings",
  // key "import_calculator"). Beheerbaar via /admin.html.
  var BASE_FEE = 500;      // vast starttarief, excl. btw
  var PRICE_PER_KM = 0.75; // per kilometer
  var VAT_RATE = 0.21;     // Belgische btw

  var form = document.getElementById("calc-form");
  if (!form) return;

  var landSel = document.getElementById("land");
  var statusEl = document.getElementById("calc-status");
  var btn = document.getElementById("calc-btn");

  var resultEl = document.getElementById("calc-result");
  var elDistance = document.getElementById("result-distance");
  var elKmCost = document.getElementById("result-km-cost");
  var elExcl = document.getElementById("result-excl");
  var elTotal = document.getElementById("result-total");
  var elTotalIncl = document.getElementById("result-total-incl");
  var elWhats = document.getElementById("result-whatsapp");
  var mapFrame = document.getElementById("calc-map");

  // ---------- Helpers ----------
  function euro(n) {
    return "€ " + n.toLocaleString("nl-BE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function setStatus(msg, isError) {
    statusEl.textContent = msg || "";
    statusEl.style.color = isError ? "#b00020" : "";
  }

  function countryCodes() {
    var v = landSel.value;
    return v ? v : "nl,be,de";
  }

  function fetchSuggestions(query) {
    var url = "https://nominatim.openstreetmap.org/search" +
      "?format=jsonv2&addressdetails=1&limit=6" +
      "&countrycodes=" + encodeURIComponent(countryCodes()) +
      "&q=" + encodeURIComponent(query);
    return fetch(url, { headers: { "Accept-Language": "nl" } })
      .then(function (r) { return r.json(); });
  }

  // ---------- Adresveld met autocomplete ----------
  // Eén instance per invoerveld. Houdt de gekozen locatie bij in `selected`.
  function AdresVeld(inputId, listId) {
    var input = document.getElementById(inputId);
    var list = document.getElementById(listId);
    var selected = null;
    var debounceTimer = null;
    var activeIndex = -1;
    var self = this;

    function render(items) {
      list.innerHTML = "";
      activeIndex = -1;
      if (!items || !items.length) { hide(); return; }
      items.forEach(function (item) {
        var li = document.createElement("li");
        li.className = "ac-item";
        li.setAttribute("role", "option");
        li.textContent = item.display_name;
        li.addEventListener("mousedown", function (e) {
          e.preventDefault(); // behoud focus
          choose(item);
        });
        list.appendChild(li);
      });
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    function hide() {
      list.hidden = true;
      list.innerHTML = "";
      activeIndex = -1;
      input.setAttribute("aria-expanded", "false");
    }

    function choose(item) {
      input.value = item.display_name;
      selected = {
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        label: item.display_name
      };
      hide();
      setStatus("");
    }

    input.addEventListener("input", function () {
      selected = null; // handmatig gewijzigd -> opnieuw geocoderen
      var q = input.value.trim();
      clearTimeout(debounceTimer);
      if (q.length < 3) { hide(); return; }
      debounceTimer = setTimeout(function () {
        fetchSuggestions(q).then(render).catch(hide);
      }, 350);
    });

    input.addEventListener("keydown", function (e) {
      if (list.hidden) return;
      var items = list.querySelectorAll(".ac-item");
      if (!items.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        items[activeIndex].dispatchEvent(new MouseEvent("mousedown"));
        return;
      } else if (e.key === "Escape") {
        hide();
        return;
      } else {
        return;
      }
      items.forEach(function (el, i) {
        el.classList.toggle("active", i === activeIndex);
      });
    });

    input.addEventListener("blur", function () {
      // korte vertraging zodat een klik op een suggestie eerst verwerkt wordt
      setTimeout(hide, 150);
    });

    // Locatie bepalen: gekozen suggestie, of anders eerste geocode-resultaat
    this.resolve = function () {
      var q = input.value.trim();
      if (q.length < 3) {
        return Promise.reject(new Error("Geef een geldig adres in bij “" + self.naam + "”."));
      }
      if (selected) return Promise.resolve(selected);
      return fetchSuggestions(q).then(function (items) {
        if (!items || !items.length) {
          throw new Error("Adres niet gevonden: “" + q + "” (" + self.naam + ").");
        }
        var first = items[0];
        selected = {
          lat: parseFloat(first.lat),
          lon: parseFloat(first.lon),
          label: first.display_name
        };
        return selected;
      });
    };

    this.hide = hide;
  }

  var ophaalVeld = new AdresVeld("adres-ophaal", "ophaal-suggesties");
  ophaalVeld.naam = "ophaaladres";
  var opleverVeld = new AdresVeld("adres-oplever", "oplever-suggesties");
  opleverVeld.naam = "opleveradres";

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".calc-autocomplete")) {
      ophaalVeld.hide();
      opleverVeld.hide();
    }
  });

  // ---------- Rij-afstand tussen twee punten (OSRM) ----------
  function drivingDistanceKm(van, naar) {
    var coords = van.lon + "," + van.lat + ";" + naar.lon + "," + naar.lat;
    var url = "https://router.project-osrm.org/route/v1/driving/" +
      coords + "?overview=false";
    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.routes && data.routes.length) {
          return data.routes[0].distance / 1000; // meters -> km
        }
        return null;
      });
  }

  // ---------- Kaart bijwerken (route ophaal -> oplever) ----------
  function updateMap(van, naar) {
    var url = "https://www.google.com/maps?saddr=" +
      van.lat + "," + van.lon +
      "&daddr=" + naar.lat + "," + naar.lon +
      "&output=embed";
    mapFrame.src = url;
  }

  // ---------- Resultaat tonen ----------
  function showResult(km, van, naar) {
    var kmRounded = Math.round(km);
    var kmCost = km * PRICE_PER_KM;
    var excl = BASE_FEE + kmCost;
    var incl = excl * (1 + VAT_RATE);

    elDistance.textContent = kmRounded.toLocaleString("nl-BE") + " km";
    elKmCost.textContent = euro(kmCost);
    elExcl.textContent = euro(excl);
    elTotal.textContent = euro(excl);
    var vatPct = (VAT_RATE * 100).toFixed(1).replace(/\.0$/, "");
    elTotalIncl.textContent = "≈ " + euro(incl) + " incl. " + vatPct + "% btw";

    var msg = "Hallo LN Motors, ik wil graag een wagen laten importeren. " +
      "Ophaaladres: " + van.label + ". Opleveradres: " + naar.label + ". " +
      "Geschatte transportkost via de calculator: " + euro(excl) + " (excl. btw, " +
      kmRounded + " km). Kunnen jullie mij een offerte bezorgen?";
    elWhats.href = "https://wa.me/32497412470?text=" + encodeURIComponent(msg);

    resultEl.hidden = false;
  }

  // ---------- Submit ----------
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    ophaalVeld.hide();
    opleverVeld.hide();
    btn.disabled = true;
    setStatus("Adressen opzoeken en route berekenen…");

    Promise.all([ophaalVeld.resolve(), opleverVeld.resolve()])
      .then(function (punten) {
        var van = punten[0];
        var naar = punten[1];
        updateMap(van, naar);
        return drivingDistanceKm(van, naar).then(function (km) {
          if (km == null) {
            throw new Error("Route kon niet berekend worden. Probeer opnieuw.");
          }
          showResult(km, van, naar);
          setStatus("");
        });
      })
      .catch(function (err) {
        resultEl.hidden = true;
        setStatus(err.message || "Er ging iets mis. Probeer het later opnieuw.", true);
      })
      .finally(function () {
        btn.disabled = false;
      });
  });

  // Bij wijzigen van land: bestaande suggesties wissen
  landSel.addEventListener("change", function () {
    ophaalVeld.hide();
    opleverVeld.hide();
  });

  // ---------- Instellingen (tarieven) uit Supabase ----------
  function laadInstellingen() {
    if (typeof db === "undefined" || !db) return;
    db.from("settings")
      .select("value")
      .eq("key", "import_calculator")
      .maybeSingle()
      .then(function (res) {
        var v = res && res.data && res.data.value;
        if (!v) return;
        if (v.base_fee != null) BASE_FEE = Number(v.base_fee);
        if (v.price_per_km != null) PRICE_PER_KM = Number(v.price_per_km);
        if (v.vat_rate != null) VAT_RATE = Number(v.vat_rate);
        // Tarieven in het resultaatpaneel bijwerken
        var elBase = document.getElementById("result-base");
        if (elBase) elBase.textContent = euro(BASE_FEE);
        var elPerKm = document.querySelector("[data-km-rate]");
        if (elPerKm) elPerKm.textContent = "(" + euro(PRICE_PER_KM) + " / km)";
      })
      .catch(function () { /* val terug op standaardwaarden */ });
  }

  laadInstellingen();
})();
