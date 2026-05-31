// ===========================================================
// LN Motors — auto's inladen vanuit Supabase
// Gebruikt op actueel-aanbod.html (status=beschikbaar)
// en verkocht.html (status=verkocht).
// ===========================================================

// Bouwt één auto-kaart (HTML-string)
function carCard(car) {
  const foto = (car.afbeeldingen && car.afbeeldingen[0])
    ? car.afbeeldingen[0]
    : "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80";

  const verkocht = car.status === "verkocht";
  const badge = verkocht
    ? '<span class="badge sold">Verkocht</span>'
    : '<span class="badge">Beschikbaar</span>';

  const meta = [car.bouwjaar, car.brandstof, car.transmissie]
    .filter(Boolean)
    .map(v => `<span>${v}</span>`)
    .join("");

  const titel = [car.merk, car.model].filter(Boolean).join(" ");
  const titelHtml = titel ? `<h3 style="margin-top:12px;">${titel}</h3>` : "";
  const metaHtml = meta ? `<div class="card-meta">${meta}</div>` : "";
  // Verkochte wagens zonder prijs tonen geen prijsregel.
  const prijsHtml = (verkocht && car.prijs == null)
    ? ""
    : `<div class="card-price">${formatPrijs(car.prijs)}</div>`;
  const alt = titel || (verkocht ? "Verkochte wagen" : "Wagen");

  return `
    <article class="card reveal">
      <div class="card-img"><img src="${foto}" alt="${alt}" loading="lazy"></div>
      <div class="card-body">
        ${badge}
        ${titelHtml}
        ${metaHtml}
        ${prijsHtml}
      </div>
    </article>`;
}

// Laadt auto's met een bepaalde status in het element met dat id
async function laadAutos(status, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center;">Aanbod laden…</p>';

  const { data, error } = await db
    .from("cars")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center;">Kon het aanbod niet laden. Probeer later opnieuw.</p>';
    return;
  }

  if (!data || data.length === 0) {
    const leeg = status === "verkocht"
      ? "Er zijn nog geen verkochte wagens om te tonen."
      : "Er staan momenteel geen wagens online. Kom snel terug!";
    container.innerHTML = `<p class="muted" style="grid-column:1/-1;text-align:center;">${leeg}</p>`;
    return;
  }

  container.innerHTML = data.map(carCard).join("");
  revealOnScroll(container);
}

// Laat kaarten één voor één naar boven komen tijdens het scrollen
function revealOnScroll(container) {
  const cards = container.querySelectorAll(".card.reveal");
  if (!("IntersectionObserver" in window)) {
    cards.forEach(c => c.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -10% 0px" });
  cards.forEach(c => observer.observe(c));
}
