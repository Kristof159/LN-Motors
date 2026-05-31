// LN Motors — cinematic scroll-scrubbed hero section (vanilla GSAP port)
// Drives a frame sequence on a <canvas> while two title halves split apart
// and the card scales up to fill the viewport, then settles back.
//
// Configure via data-attributes on .hero-scrub:
//   data-frame-count   number of frames (default 0 → no frames, graceful fallback)
//   data-frame-pattern URL template, "#" is replaced by a zero-padded index
//   data-frame-pad     zero-padding width for the index (default 4)
//   data-frame-start   first frame index (default 0)
//   data-accent        background accent hex (default #0d0d0d)

(function () {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);

  const PIN_VH_MULTIPLE = 3.2;
  const IMMERSE_OVERFILL = 1.04;
  const ENTRY_DELAY = 0.2;
  const CARD_START_SCALE_DESKTOP = 0.6;
  const CARD_START_SCALE_MOBILE = 0.82;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll(".hero-scrub").forEach(setup);

  function setup(section) {
    const sticky = section.querySelector(".hero-scrub-sticky");
    const bg = section.querySelector(".hero-scrub-bg");
    const card = section.querySelector(".hero-scrub-card");
    const canvas = section.querySelector(".hero-scrub-canvas");
    const titleTop = section.querySelector(".hero-scrub-title-top");
    const titleBottom = section.querySelector(".hero-scrub-title-bottom");
    if (!sticky || !card) return;

    const frameCount = parseInt(section.dataset.frameCount || "0", 10);
    const pattern = section.dataset.framePattern || "";
    const pad = parseInt(section.dataset.framePad || "4", 10);
    const startIndex = parseInt(section.dataset.frameStart || "0", 10);

    const frameUrl = (i) =>
      pattern.replace("#", String(startIndex + i).padStart(pad, "0"));

    const images = [];
    let lastDrawn = -1;
    let aspect = 16 / 9;
    let framesOk = frameCount > 0 && pattern.length > 0;
    let ready = !framesOk; // if no frames, we're "ready" immediately

    // ---- Frame loading -----------------------------------------------------
    if (framesOk && !reduced) {
      loadFrames();
    }

    function loadFrames() {
      let errored = 0;

      const onFirstReady = (img) => {
        if (canvas && img.naturalWidth && img.naturalHeight) {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.drawImage(img, 0, 0);
          lastDrawn = 0;
          aspect = img.naturalWidth / img.naturalHeight;
          applyAspect();
        }
        ready = true;
        buildTimeline();
      };

      const onErr = () => {
        errored++;
        if (errored >= 5) {
          framesOk = false;
          ready = true;
          if (canvas) canvas.style.display = "none";
          buildTimeline();
        }
      };

      const loadOne = (i) => {
        const img = new Image();
        img.decoding = "async";
        if (i < 4) img.fetchPriority = "high";
        img.onerror = onErr;
        if (i === 0) img.onload = () => onFirstReady(img);
        img.src = frameUrl(i);
        images[i] = img;
      };

      const INITIAL = Math.min(20, frameCount);
      for (let i = 0; i < INITIAL; i++) loadOne(i);

      const BATCH = 20;
      let cursor = INITIAL;
      const loadNext = () => {
        const end = Math.min(frameCount, cursor + BATCH);
        for (let i = cursor; i < end; i++) loadOne(i);
        cursor = end;
        if (cursor < frameCount) setTimeout(loadNext, 80);
      };
      setTimeout(loadNext, 200);

      setTimeout(() => {
        if (!images[0] || !images[0].complete) {
          framesOk = false;
          ready = true;
          if (canvas) canvas.style.display = "none";
          buildTimeline();
        }
      }, 4500);
    }

    function applyAspect() {
      card.style.width = `min(96vw, calc(72svh * ${aspect}))`;
      card.style.height = `min(72svh, 96vw / ${aspect})`;
      card.style.aspectRatio = String(aspect);
    }
    applyAspect();

    // ---- Entry animation ---------------------------------------------------
    if (!reduced) {
      const tl = gsap.timeline({ delay: ENTRY_DELAY });
      if (bg) tl.from(bg, { opacity: 0, duration: 1.4, ease: "power2.out" });
      tl.from(card, { opacity: 0, duration: 1.1, ease: "power3.out" }, 0.35);
      if (titleTop)
        tl.from(titleTop, { opacity: 0, y: 30, duration: 1, ease: "expo.out" }, 0.5);
      if (titleBottom)
        tl.from(titleBottom, { opacity: 0, y: -30, duration: 1, ease: "expo.out" }, 0.62);
    }

    // ---- Scroll choreography ----------------------------------------------
    let built = false;

    function buildTimeline() {
      if (built || reduced || !ready) return;
      built = true;

      const startScale = () =>
        window.innerWidth < 768 ? CARD_START_SCALE_MOBILE : CARD_START_SCALE_DESKTOP;

      const immerseScale = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const baseW = Math.min(vw * 0.96, vh * 0.72 * aspect);
        const baseH = Math.min(vh * 0.72, (vw * 0.96) / aspect);
        if (baseW <= 0 || baseH <= 0) return 1.5;
        return Math.max(vw / baseW, vh / baseH) * IMMERSE_OVERFILL;
      };

      const isLoaded = (i) => {
        const img = images[i];
        return !!img && img.complete && img.naturalWidth > 0;
      };

      const drawFrame = (index) => {
        if (!framesOk || !canvas) return;
        let useIdx = index;
        if (!isLoaded(useIdx)) {
          let found = -1;
          for (let d = 1; d < frameCount; d++) {
            if (useIdx - d >= 0 && isLoaded(useIdx - d)) { found = useIdx - d; break; }
            if (useIdx + d < frameCount && isLoaded(useIdx + d)) { found = useIdx + d; break; }
          }
          if (found === -1) return;
          useIdx = found;
        }
        if (lastDrawn === useIdx) return;
        const img = images[useIdx];
        const ctx = canvas.getContext("2d");
        if (!ctx || !img) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        lastDrawn = useIdx;
      };

      gsap.set(card, { scale: startScale(), transformOrigin: "50% 50%" });

      const master = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.4,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (!framesOk) return;
            const p = self.progress;
            const mapped = gsap.utils.clamp(0, 1, (p - 0.15) / 0.63);
            const frameIdx = Math.min(frameCount - 1, Math.floor(mapped * frameCount));
            drawFrame(frameIdx);
          },
        },
      });

      // Phase 1: card grows to natural size, titles ease toward edges
      master.to(card, { scale: 1, ease: "power2.out", duration: 0.15 }, 0);
      if (titleTop)
        master.to(titleTop, {
          x: () => (window.innerWidth < 768 ? "-70vw" : "-60vw"),
          letterSpacing: "0.02em", ease: "power2.inOut", duration: 0.15,
        }, 0);
      if (titleBottom)
        master.to(titleBottom, {
          x: () => (window.innerWidth < 768 ? "70vw" : "60vw"),
          letterSpacing: "0.02em", ease: "power2.inOut", duration: 0.15,
        }, 0);

      // Phase 2: immersion — card fills the viewport, titles fade out
      master.to(card, { scale: immerseScale(), ease: "power2.in", duration: 0.63 }, 0.15);
      if (titleTop)
        master.to(titleTop, { opacity: 0, ease: "power1.in", duration: 0.22 }, 0.15);
      if (titleBottom)
        master.to(titleBottom, { opacity: 0, ease: "power1.in", duration: 0.22 }, 0.15);

      // Phase 3: settle back — card shrinks, titles return
      master.to(card, { scale: startScale(), ease: "power3.inOut", duration: 0.22 }, 0.78);
      if (titleTop)
        master.to(titleTop, {
          x: 0, opacity: 1, letterSpacing: "-0.04em", ease: "power2.inOut", duration: 0.22,
        }, 0.78);
      if (titleBottom)
        master.to(titleBottom, {
          x: 0, opacity: 1, letterSpacing: "-0.04em", ease: "power2.inOut", duration: 0.22,
        }, 0.78);

      ScrollTrigger.refresh();
    }

    // If there are no frames, build the timeline straight away.
    if (!framesOk && !reduced) buildTimeline();

    // Reduced motion: collapse the tall section to a single viewport.
    if (reduced) {
      section.style.height = "auto";
      sticky.style.position = "static";
      sticky.style.height = "100svh";
    } else {
      section.style.height = `${(PIN_VH_MULTIPLE + 1) * 100}vh`;
    }
  }
})();
