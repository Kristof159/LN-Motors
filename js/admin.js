// ===========================================================
// LN Motors — admin: login + auto's beheren
// ===========================================================

const loginView = document.getElementById("login-view");
const adminView = document.getElementById("admin-view");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");

const carForm = document.getElementById("car-form");
const carList = document.getElementById("car-list");
const formTitle = document.getElementById("form-title");
const formNote = document.getElementById("form-note");
const resetBtn = document.getElementById("reset-btn");

// Foto-beheer bij bewerken
const huidigeFotosVeld = document.getElementById("huidige-fotos-veld");
const huidigeFotosBox = document.getElementById("huidige-fotos");
let huidigeFotos = [];        // foto's die (nog) bij de auto horen
let teVerwijderenFotos = [];  // foto's die de admin weghaalde -> bij opslaan uit Storage

// Toont de huidige foto's als thumbnails met een verwijderknop
function renderHuidigeFotos() {
  if (!huidigeFotos.length) {
    huidigeFotosVeld.style.display = "none";
    huidigeFotosBox.innerHTML = "";
    return;
  }
  huidigeFotosVeld.style.display = "";
  huidigeFotosBox.innerHTML = huidigeFotos.map((url, i) => `
    <div class="foto-thumb">
      <img src="${url}" alt="">
      <button type="button" title="Verwijderen" onclick="verwijderFoto(${i})">✕</button>
    </div>`).join("");
}

// Haalt een foto uit de lijst (definitief pas bij Opslaan)
function verwijderFoto(index) {
  const [weg] = huidigeFotos.splice(index, 1);
  if (weg) teVerwijderenFotos.push(weg);
  renderHuidigeFotos();
}

// --- Auth-status bepalen welke view we tonen ---------------
async function refreshSession() {
  const { data } = await db.auth.getSession();
  if (data.session) {
    loginView.style.display = "none";
    adminView.style.display = "block";
    laadBeheerlijst();
    laadCalcInstellingen();
  } else {
    loginView.style.display = "block";
    adminView.style.display = "none";
  }
}

// --- Inloggen ----------------------------------------------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = "Inloggen mislukt: " + error.message;
    return;
  }
  refreshSession();
});

logoutBtn.addEventListener("click", async () => {
  await db.auth.signOut();
  refreshSession();
});

// --- Beheerlijst laden -------------------------------------
async function laadBeheerlijst() {
  carList.innerHTML = '<p class="muted">Laden…</p>';
  const { data, error } = await db
    .from("cars")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    carList.innerHTML = '<p class="muted">Fout bij laden: ' + error.message + "</p>";
    return;
  }
  if (!data.length) {
    carList.innerHTML = '<p class="muted">Nog geen auto\'s toegevoegd.</p>';
    return;
  }

  carList.innerHTML = data.map(rowHtml).join("");
}

function rowHtml(car) {
  const foto = (car.afbeeldingen && car.afbeeldingen[0]) || "";
  const thumb = foto
    ? `<img src="${foto}" alt="" style="width:70px;height:52px;object-fit:cover;border-radius:4px;">`
    : '<div style="width:70px;height:52px;background:var(--bg-soft);border-radius:4px;"></div>';
  const badge = car.status === "verkocht"
    ? '<span class="badge sold">Verkocht</span>'
    : '<span class="badge">Beschikbaar</span>';

  const naarStatus = car.status === "verkocht" ? "beschikbaar" : "verkocht";
  const statusLabel = car.status === "verkocht" ? "Terug in aanbod" : "Markeer verkocht";

  return `
    <div class="admin-row">
      ${thumb}
      <div style="flex:1;">
        <strong>${car.merk} ${car.model}</strong> ${badge}<br>
        <span class="muted" style="font-size:.85rem;">${[car.bouwjaar, formatPrijs(car.prijs)].filter(Boolean).join(" · ")}</span>
      </div>
      <button class="btn btn-primary btn-sm" onclick='wijzigStatus(${JSON.stringify(car.id)}, ${JSON.stringify(naarStatus)})'>${statusLabel}</button>
      <button class="btn btn-outline btn-sm" onclick='bewerkAuto(${JSON.stringify(car.id)})'>Bewerken</button>
      <button class="btn btn-outline btn-sm" onclick='verwijderAuto(${JSON.stringify(car.id)}, ${JSON.stringify(car.afbeeldingen || [])})'>Verwijderen</button>
    </div>`;
}

// --- Status wisselen (beschikbaar <-> verkocht) ------------
async function wijzigStatus(id, nieuweStatus) {
  const { error } = await db.from("cars").update({ status: nieuweStatus }).eq("id", id);
  if (error) { alert("Status wijzigen mislukt: " + error.message); return; }
  laadBeheerlijst();
}

// --- Foto's uploaden naar Storage --------------------------
async function uploadFotos(files) {
  const urls = [];
  for (const file of files) {
    const naam = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const { error } = await db.storage.from("car-images").upload(naam, file);
    if (error) throw error;
    const { data } = db.storage.from("car-images").getPublicUrl(naam);
    urls.push(data.publicUrl);
  }
  return urls;
}

// --- Auto opslaan (toevoegen of bewerken) ------------------
carForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formNote.textContent = "Opslaan…";

  const id = document.getElementById("car-id").value;
  const fileInput = document.getElementById("car-fotos");

  try {
    let afbeeldingen = huidigeFotos.slice();
    if (fileInput.files.length) {
      const nieuwe = await uploadFotos(fileInput.files);
      afbeeldingen = afbeeldingen.concat(nieuwe);
    }

    const car = {
      merk: document.getElementById("car-merk").value.trim(),
      model: document.getElementById("car-model").value.trim(),
      bouwjaar: numOrNull(document.getElementById("car-bouwjaar").value),
      prijs: numOrNull(document.getElementById("car-prijs").value),
      km: numOrNull(document.getElementById("car-km").value),
      brandstof: leegOfWaarde(document.getElementById("car-brandstof").value),
      transmissie: leegOfWaarde(document.getElementById("car-transmissie").value),
      status: document.getElementById("car-status").value,
      beschrijving: leegOfWaarde(document.getElementById("car-beschrijving").value),
      afbeeldingen,
    };

    let error;
    if (id) {
      ({ error } = await db.from("cars").update(car).eq("id", id));
    } else {
      ({ error } = await db.from("cars").insert(car));
    }
    if (error) throw error;

    // Weggehaalde foto's nu pas definitief uit Storage verwijderen
    if (teVerwijderenFotos.length) {
      const paden = teVerwijderenFotos.map(u => u.split("/car-images/")[1]).filter(Boolean);
      if (paden.length) await db.storage.from("car-images").remove(paden);
    }

    formNote.textContent = "Opgeslagen!";
    resetForm();
    laadBeheerlijst();
  } catch (err) {
    formNote.textContent = "Fout: " + err.message;
  }
});

resetBtn.addEventListener("click", resetForm);

function resetForm() {
  carForm.reset();
  document.getElementById("car-id").value = "";
  huidigeFotos = [];
  teVerwijderenFotos = [];
  renderHuidigeFotos();
  formTitle.textContent = "Auto toevoegen";
  setTimeout(() => (formNote.textContent = ""), 2500);
}

// --- Bewerken: formulier vullen ----------------------------
async function bewerkAuto(id) {
  const { data, error } = await db.from("cars").select("*").eq("id", id).single();
  if (error) { alert("Kon auto niet laden: " + error.message); return; }

  document.getElementById("car-id").value = data.id;
  document.getElementById("car-merk").value = data.merk || "";
  document.getElementById("car-model").value = data.model || "";
  document.getElementById("car-bouwjaar").value = data.bouwjaar ?? "";
  document.getElementById("car-prijs").value = data.prijs ?? "";
  document.getElementById("car-km").value = data.km ?? "";
  document.getElementById("car-brandstof").value = data.brandstof || "";
  document.getElementById("car-transmissie").value = data.transmissie || "";
  document.getElementById("car-status").value = data.status || "beschikbaar";
  document.getElementById("car-beschrijving").value = data.beschrijving || "";

  // Bestaande foto's tonen voor beheer
  huidigeFotos = (data.afbeeldingen || []).slice();
  teVerwijderenFotos = [];
  renderHuidigeFotos();

  formTitle.textContent = "Auto bewerken";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// --- Verwijderen -------------------------------------------
async function verwijderAuto(id, afbeeldingen) {
  if (!confirm("Deze auto verwijderen?")) return;

  // Foto's uit Storage halen (paden = laatste deel van de URL)
  if (afbeeldingen && afbeeldingen.length) {
    const paden = afbeeldingen.map(url => url.split("/car-images/")[1]).filter(Boolean);
    if (paden.length) await db.storage.from("car-images").remove(paden);
  }

  const { error } = await db.from("cars").delete().eq("id", id);
  if (error) { alert("Verwijderen mislukt: " + error.message); return; }
  laadBeheerlijst();
}

// --- Import calculator-instellingen ------------------------
const calcSettingsForm = document.getElementById("calc-settings-form");
const calcSettingsNote = document.getElementById("calc-settings-note");

async function laadCalcInstellingen() {
  const { data, error } = await db
    .from("settings")
    .select("value")
    .eq("key", "import_calculator")
    .maybeSingle();

  if (error) {
    calcSettingsNote.textContent = "Fout bij laden: " + error.message;
    return;
  }

  const v = (data && data.value) || {};
  document.getElementById("set-base-fee").value = v.base_fee ?? 500;
  document.getElementById("set-price-km").value = v.price_per_km ?? 0.75;
  // btw als percentage tonen (0.21 -> 21)
  document.getElementById("set-vat").value = ((v.vat_rate ?? 0.21) * 100).toFixed(1).replace(/\.0$/, "");
}

calcSettingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  calcSettingsNote.textContent = "Opslaan…";

  const value = {
    base_fee: Number(document.getElementById("set-base-fee").value),
    price_per_km: Number(document.getElementById("set-price-km").value),
    // percentage terug naar fractie (21 -> 0.21)
    vat_rate: Number(document.getElementById("set-vat").value) / 100,
  };

  const { error } = await db
    .from("settings")
    .upsert({ key: "import_calculator", value, updated_at: new Date().toISOString() });

  if (error) {
    calcSettingsNote.textContent = "Fout: " + error.message;
    return;
  }
  calcSettingsNote.textContent = "Opgeslagen!";
  setTimeout(() => (calcSettingsNote.textContent = ""), 2500);
});

// --- Hulpjes -----------------------------------------------
function numOrNull(v) { return v === "" || v == null ? null : Number(v); }
function leegOfWaarde(v) { return v.trim() === "" ? null : v.trim(); }

// Start
refreshSession();
